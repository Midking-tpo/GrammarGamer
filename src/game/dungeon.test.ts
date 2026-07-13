import { describe, expect, it } from 'vitest';
import { EQUIPMENT } from '../data/equipment';
import {
  applyComboGoldBonus,
  attackPrice,
  comboMultiplier,
  computeAttack,
  computeIncoming,
  defensePrice,
  drawShopEquipment,
  enemyStats,
  goldReward,
  healPrice,
  initialCount,
  jubutsuBackfire,
  leftoverHeal,
  newRun,
  type AttackContext,
  type DefenseContext,
} from './dungeon';

function attackCtx(overrides: Partial<AttackContext> = {}): AttackContext {
  return {
    atk: 10,
    combo: 1,
    equipment: [],
    isFirstAttackOfBattle: false,
    iburiActive: false,
    answerSec: 5,
    enemyHp: 100,
    enemyMaxHp: 100,
    radishUsedThisBattle: false,
    ...overrides,
  };
}

function defenseCtx(overrides: Partial<DefenseContext> = {}): DefenseContext {
  return {
    enemyAtk: 10,
    cause: 'count',
    equipment: [],
    noMissSoFar: true,
    coinUsedThisBattle: false,
    maxHp: 100,
    rng: () => 0.99, // マント不発
    ...overrides,
  };
}

describe('enemyStats', () => {
  it('階が進むほどHP/ATKが増える（ATKは緩やかな線形、HPは加速項つき）', () => {
    expect(enemyStats(1)).toEqual({ hp: 40, atk: 10, countMax: 8 });
    expect(enemyStats(4)).toEqual({ hp: 101, atk: 11, countMax: 8 });
    expect(enemyStats(10)).toEqual({ hp: 226, atk: 12, countMax: 8 });
    for (let f = 1; f < 30; f++) {
      expect(enemyStats(f + 1).hp).toBeGreaterThan(enemyStats(f).hp);
      expect(enemyStats(f + 1).atk).toBeGreaterThanOrEqual(enemyStats(f).atk);
    }
  });

  it('加速項により、HPの増加ペースが階を追うごとに速くなる（線形ではない）', () => {
    const diffEarly = enemyStats(2).hp - enemyStats(1).hp;
    const diffLate = enemyStats(30).hp - enemyStats(29).hp;
    expect(diffLate).toBeGreaterThan(diffEarly);
  });
});

describe('comboMultiplier', () => {
  it('初回100%開始・+10%/コンボ・上限200%（11コンボ到達）', () => {
    expect(comboMultiplier(1)).toBe(1.0);
    expect(comboMultiplier(2)).toBe(1.1);
    expect(comboMultiplier(10)).toBe(1.9);
    expect(comboMultiplier(11)).toBe(2.0);
    expect(comboMultiplier(50)).toBe(2.0);
    expect(comboMultiplier(0)).toBe(1.0);
  });
});

describe('goldReward', () => {
  it('範囲 [2+f, 4+2f] に収まる', () => {
    for (const floor of [1, 5, 10]) {
      for (let i = 0; i < 50; i++) {
        const g = goldReward(floor);
        expect(g).toBeGreaterThanOrEqual(2 + floor);
        expect(g).toBeLessThanOrEqual(4 + 2 * floor);
      }
    }
    expect(goldReward(3, () => 0)).toBe(5); // 最小
    expect(goldReward(3, () => 0.999)).toBe(10); // 最大
  });
});

describe('SHOP価格', () => {
  it('購入回数で値上がりする', () => {
    expect([attackPrice(0), attackPrice(1), attackPrice(2)]).toEqual([10, 15, 20]);
    expect([defensePrice(0), defensePrice(1)]).toEqual([10, 15]);
    expect([healPrice(0), healPrice(1), healPrice(2)]).toEqual([30, 50, 70]);
  });
});

describe('initialCount', () => {
  it('基準8秒 + ステッキ+1 + マグロ初回+10', () => {
    expect(initialCount([], true)).toBe(8);
    expect(initialCount(['n-stick'], true)).toBe(9);
    expect(initialCount(['r-tuna'], true)).toBe(18);
    expect(initialCount(['r-tuna'], false)).toBe(8); // 2回目以降は効かない
    expect(initialCount(['n-stick', 'r-tuna'], true)).toBe(19);
  });
});

describe('drawShopEquipment', () => {
  it('所持中は並ばず、同一SHOP内で重複しない', () => {
    for (let i = 0; i < 30; i++) {
      const held = ['n-sword', 'r-pistol'];
      const stock = drawShopEquipment(held);
      expect(stock.length).toBe(3);
      const ids = stock.map((e) => e.id);
      expect(new Set(ids).size).toBe(3);
      for (const id of ids) expect(held).not.toContain(id);
    }
  });

  it('未所持が3未満なら残数だけ並ぶ', () => {
    const held = EQUIPMENT.slice(0, EQUIPMENT.length - 2).map((e) => e.id);
    const stock = drawShopEquipment(held);
    expect(stock.length).toBe(2);
  });

  it('レジェンド抽選でプールが空ならフォールバックする', () => {
    // rng=0.99999 → レア度ロールは必ずレジェンド帯(95%〜)
    const held = ['l-water'];
    const rolls = [0.96, 0.5, 0.96, 0.5, 0.96, 0.5];
    let i = 0;
    const stock = drawShopEquipment(held, () => rolls[i++ % rolls.length]);
    expect(stock.length).toBe(3);
    for (const e of stock) expect(e.id).not.toBe('l-water');
  });
});

describe('computeAttack', () => {
  it('基本: ATK×コンボ補正', () => {
    expect(computeAttack(attackCtx({ atk: 10, combo: 1 })).total).toBe(10);
    expect(computeAttack(attackCtx({ atk: 10, combo: 5 })).total).toBe(14);
  });

  it('ふつうのけん: +10%', () => {
    expect(computeAttack(attackCtx({ equipment: ['n-sword'] })).total).toBe(11);
  });

  it('レーザードローン: ATK50%×コンボを加算', () => {
    // 10×1.1(combo2) + 10×0.5×2 = 11+10 = 21
    expect(computeAttack(attackCtx({ combo: 2, equipment: ['s-drone'] })).total).toBe(21);
  });

  it('ふいうちうんち: 初撃のみ2倍', () => {
    expect(
      computeAttack(attackCtx({ equipment: ['r-poop'], isFirstAttackOfBattle: true })).total,
    ).toBe(20);
    expect(
      computeAttack(attackCtx({ equipment: ['r-poop'], isFirstAttackOfBattle: false })).total,
    ).toBe(10);
  });

  it('いぶりがっこ有効時は2倍', () => {
    expect(computeAttack(attackCtx({ iburiActive: true })).total).toBe(20);
  });

  it('はやうちピストル: 2秒以内なら2ヒット', () => {
    const fast = computeAttack(attackCtx({ equipment: ['r-pistol'], answerSec: 2 }));
    expect(fast.hits).toEqual([10, 10]);
    const borderline = computeAttack(attackCtx({ equipment: ['r-pistol'], answerSec: 3 }));
    expect(borderline.hits).toEqual([10]); // 3秒はもう対象外(旧しきい値からの変更点)
    const slow = computeAttack(attackCtx({ equipment: ['r-pistol'], answerSec: 4 }));
    expect(slow.hits).toEqual([10]);
  });

  it('かいりきオウムガイ: 10コンボ以上で20倍', () => {
    // 10 × 1.9(combo10) × 20 = 380
    expect(computeAttack(attackCtx({ combo: 10, equipment: ['s-nautilus'] })).total).toBe(380);
    expect(computeAttack(attackCtx({ combo: 9, equipment: ['s-nautilus'] })).total).toBe(18);
  });

  it('5コンボダイコン: 戦闘初の5コンボで敵最大HP50%の追加ダメージ', () => {
    const r = computeAttack(attackCtx({ combo: 5, equipment: ['s-radish'], enemyMaxHp: 40 }));
    expect(r.radishTriggered).toBe(true);
    expect(r.radishBonus).toBe(20);
    const used = computeAttack(
      attackCtx({ combo: 6, equipment: ['s-radish'], radishUsedThisBattle: true }),
    );
    expect(used.radishTriggered).toBe(false);
  });

  it('とっきゅうじゅぶつ: 与ダメージ=敵の現在HP（即死）', () => {
    const r = computeAttack(attackCtx({ equipment: ['n-charm'], enemyHp: 55 }));
    expect(r.jubutsuUsed).toBe(true);
    expect(r.total).toBe(55);
  });
});

describe('computeIncoming', () => {
  it('基本: 敵ATKをそのまま受ける', () => {
    expect(computeIncoming(defenseCtx()).damage).toBe(10);
  });

  it('たて/シールドで軽減される', () => {
    expect(computeIncoming(defenseCtx({ equipment: ['n-shield'] })).damage).toBe(10); // 9.5→round10
    expect(computeIncoming(defenseCtx({ enemyAtk: 20, equipment: ['n-shield'] })).damage).toBe(19);
    expect(computeIncoming(defenseCtx({ equipment: ['r-autoshield'] })).damage).toBe(5);
  });

  it('がっちりアーマー: 最大HP5%以下なら0', () => {
    expect(computeIncoming(defenseCtx({ enemyAtk: 5, equipment: ['r-armor'] })).damage).toBe(0);
    expect(computeIncoming(defenseCtx({ enemyAtk: 6, equipment: ['r-armor'] })).damage).toBe(6);
  });

  it('きまぐれマント: 10%で0', () => {
    expect(
      computeIncoming(defenseCtx({ equipment: ['n-cloak'], rng: () => 0.05 })).damage,
    ).toBe(0);
    expect(
      computeIncoming(defenseCtx({ equipment: ['n-cloak'], rng: () => 0.5 })).damage,
    ).toBe(10);
  });

  it('いかさまコイン: 戦闘初ミスを無効化（カウント被弾には効かない）', () => {
    const miss = computeIncoming(defenseCtx({ cause: 'miss', equipment: ['n-coin'] }));
    expect(miss.damage).toBe(0);
    expect(miss.coinUsed).toBe(true);
    const count = computeIncoming(defenseCtx({ cause: 'count', equipment: ['n-coin'] }));
    expect(count.coinUsed).toBe(false);
    const second = computeIncoming(
      defenseCtx({ cause: 'miss', equipment: ['n-coin'], coinUsedThisBattle: true }),
    );
    expect(second.damage).toBe(10);
  });

  it('ノーミスの水: 未ミス中のカウント被弾は基礎ATK分(10)、ミスで消滅', () => {
    const count = computeIncoming(defenseCtx({ equipment: ['l-water'], noMissSoFar: true }));
    expect(count.damage).toBe(10);
    expect(count.waterLost).toBe(false);
    const miss = computeIncoming(
      defenseCtx({ cause: 'miss', equipment: ['l-water'], noMissSoFar: true }),
    );
    expect(miss.damage).toBe(10); // ミス自体は防げない
    expect(miss.waterLost).toBe(true);
  });

  it('しかえしわたがし: 受けたダメージの25%を反射', () => {
    const r = computeIncoming(defenseCtx({ enemyAtk: 8, equipment: ['n-candy'] }));
    expect(r.reflect).toBe(2);
    const zero = computeIncoming(
      defenseCtx({ enemyAtk: 5, equipment: ['n-candy', 'r-armor'] }),
    );
    expect(zero.reflect).toBe(0); // 0ダメージなら反射なし
  });
});

describe('leftoverHeal / jubutsuBackfire / newRun', () => {
  it('たべのこし: 最大HPの6.25%（最低1）回復', () => {
    expect(leftoverHeal(['r-leftover'], 10)).toBe(1);
    expect(leftoverHeal(['r-leftover'], 32)).toBe(2);
    expect(leftoverHeal([], 100)).toBe(0);
  });

  it('じゅぶつ: 50%で自滅', () => {
    expect(jubutsuBackfire(['n-charm'], () => 0.4)).toBe(true);
    expect(jubutsuBackfire(['n-charm'], () => 0.6)).toBe(false);
    expect(jubutsuBackfire([], () => 0.1)).toBe(false);
  });

  it('newRun: 仕様どおり HP150 / ATK10 / 0G から開始', () => {
    const run = newRun();
    expect(run.hp).toBe(150);
    expect(run.maxHp).toBe(150);
    expect(run.atk).toBe(10);
    expect(run.gold).toBe(0);
    expect(run.floor).toBe(1);
    expect(run.equipment).toEqual([]);
  });
});

describe('applyComboGoldBonus', () => {
  it('10コンボ以上到達でゴールド報酬が3倍になる', () => {
    expect(applyComboGoldBonus(10, 9)).toBe(10); // 未到達
    expect(applyComboGoldBonus(10, 10)).toBe(30); // ちょうど到達
    expect(applyComboGoldBonus(10, 15)).toBe(30); // 超過でも同じ倍率
  });
});
