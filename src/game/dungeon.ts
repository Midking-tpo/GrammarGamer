import { EQUIPMENT, RARITY_WEIGHTS } from '../data/equipment';
import type { DungeonMode, DungeonRun, EquipmentDef, Rarity } from '../types';

/** 乱数生成器（テスト時にシード注入できるよう関数で受け取る） */
export type Rng = () => number;

// ===== 基本パラメータ =====

export const DUNGEON_START = {
  hp: 150,
  maxHp: 150,
  atk: 10,
  gold: 0,
} as const;

/**
 * 敵カウント（秒）はモードごとの想定解答速度に応じてスケールする。
 * 基準: 1問3秒・countMax8秒でバランス検証済み（2026-07-13）のため、その比率(8/3)を維持する。
 */
const REFERENCE_ANSWER_SEC = 3;
const REFERENCE_COUNT_MAX = 8;
/** モードごとの想定解答時間（秒） */
export const MODE_ASSUMED_ANSWER_SEC: Record<DungeonMode, number> = {
  hard: 5,
  easy: 8,
};
/** モードごとの敵カウント（秒） */
export const MODE_COUNT_MAX: Record<DungeonMode, number> = {
  hard: Math.round((MODE_ASSUMED_ANSWER_SEC.hard * REFERENCE_COUNT_MAX) / REFERENCE_ANSWER_SEC),
  easy: Math.round((MODE_ASSUMED_ANSWER_SEC.easy * REFERENCE_COUNT_MAX) / REFERENCE_ANSWER_SEC),
};
/** イージーモード開始時に配布される先行G（最初の戦闘前にSHOPを利用できる） */
export const EASY_MODE_STARTING_GOLD = 30;
/** SHOPが出現する戦闘間隔 */
export const SHOP_INTERVAL = 2;
/** そうびの保有上限 */
export const EQUIPMENT_LIMIT = 3;
/** SHOPのそうびラインナップを引き直す価格（固定） */
export const SHOP_REROLL_PRICE = 20;

export function newRun(mode: DungeonMode): DungeonRun {
  const isEasy = mode === 'easy';
  return {
    mode,
    floor: 1,
    battlesCleared: 0,
    hp: DUNGEON_START.hp,
    maxHp: DUNGEON_START.maxHp,
    atk: DUNGEON_START.atk,
    gold: isEasy ? EASY_MODE_STARTING_GOLD : DUNGEON_START.gold,
    goldEarned: 0,
    combo: 0,
    equipment: [],
    atkBought: 0,
    defBought: 0,
    healBought: 0,
    nextBattleDoubleDamage: false,
    phase: isEasy ? 'shop' : 'battle',
    shopStock: isEasy ? drawShopEquipment([]).map((e) => e.id) : null,
    wrongQuestionIds: [],
    totalCorrect: 0,
    maxCombo: 0,
    usedLegend: false,
    hadNoMissWin: false,
  };
}

// ===== 敵スケーリング =====

/** 敵HPの加速係数。深層ほど撃破に必要な正解数が増えるよう、階数の2乗で上乗せする(要プレイテスト調整)。 */
export const ENEMY_HP_ACCEL = 0.08;
/** 敵ATKの基準値・上昇率(緩やかな線形。コンボが戦闘毎リセットになったため急激な上昇は不要)。 */
export const ENEMY_ATK_BASE = 10;
export const ENEMY_ATK_SLOPE = 0.2;
/**
 * 装備やアップグレードが揃う階層(30階超)からは、それまでの上昇に上乗せしてさらに加速させる。
 * floor<=POST_ACCEL_FLOORまではこれまでどおりの数値のまま変化しない。
 */
export const POST_ACCEL_FLOOR = 30;
export const POST_ACCEL_HP = 2;
export const POST_ACCEL_ATK_SLOPE = 0.5;

export function enemyStats(
  floor: number,
  mode: DungeonMode,
): { hp: number; atk: number; countMax: number } {
  const over = Math.max(0, floor - POST_ACCEL_FLOOR);
  return {
    hp: Math.round(
      10 * (2 * floor + 2) + ENEMY_HP_ACCEL * (floor - 1) ** 2 + POST_ACCEL_HP * over ** 2,
    ),
    atk: Math.round(
      ENEMY_ATK_BASE + ENEMY_ATK_SLOPE * (floor - 1) + POST_ACCEL_ATK_SLOPE * over,
    ),
    countMax: MODE_COUNT_MAX[mode],
  };
}

/** 戦闘開始時のカウント初期値（ステッキ常時+1、マグロは初回のみ+10） */
export function initialCount(
  equipment: string[],
  isFirstCountOfBattle: boolean,
  mode: DungeonMode,
): number {
  let count = MODE_COUNT_MAX[mode];
  if (equipment.includes('n-stick')) count += 1;
  if (isFirstCountOfBattle && equipment.includes('r-tuna')) count += 10;
  return count;
}

// ===== ゴールド =====

export function goldReward(floor: number, rng: Rng = Math.random): number {
  const min = 2 + floor;
  const max = 4 + 2 * floor;
  return min + Math.floor(rng() * (max - min + 1));
}

/** その戦闘で到達した最大コンボ数がこの値以上ならゴールド報酬を増額する */
export const COMBO_GOLD_BONUS_THRESHOLD = 10;
export const COMBO_GOLD_BONUS_MULTIPLIER = 3;

/** 10コンボ到達（戦闘毎リセットの中で稼ぐ長期的メリット）でゴールド報酬を増額する */
export function applyComboGoldBonus(gold: number, maxComboInBattle: number): number {
  return maxComboInBattle >= COMBO_GOLD_BONUS_THRESHOLD
    ? Math.round(gold * COMBO_GOLD_BONUS_MULTIPLIER)
    : gold;
}

// ===== SHOP価格 =====

export const attackPrice = (bought: number) => 10 + 5 * bought;
export const defensePrice = (bought: number) => 10 + 5 * bought;
export const healPrice = (bought: number) => 30 + 20 * bought;

// ===== コンボ補正 =====

/** 初回正解100%開始、+10%/コンボ、上限200%（11コンボで到達） */
export function comboMultiplier(combo: number): number {
  if (combo <= 0) return 1;
  return Math.min(100 + (combo - 1) * 10, 200) / 100;
}

// ===== そうび抽選 =====

function rollRarity(rng: Rng): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [Rarity, number][]) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return 'normal';
}

/**
 * SHOPに並べるそうびを3枠抽選する。
 * - 所持中のそうびは並ばない / 同一SHOP内で重複しない
 * - 抽選レア度のプールが空なら未所持全体からのフォールバック
 */
export function drawShopEquipment(heldIds: string[], rng: Rng = Math.random): EquipmentDef[] {
  const result: EquipmentDef[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const available = EQUIPMENT.filter(
      (e) => !heldIds.includes(e.id) && !result.some((r) => r.id === e.id),
    );
    if (available.length === 0) break;
    const rarity = rollRarity(rng);
    const pool = available.filter((e) => e.rarity === rarity);
    const candidates = pool.length > 0 ? pool : available;
    result.push(candidates[Math.floor(rng() * candidates.length)]);
  }
  return result;
}

// ===== ダメージ計算: プレイヤーの攻撃（正解時） =====

export interface AttackContext {
  atk: number;
  combo: number; // 正解で+1した後の値
  equipment: string[];
  isFirstAttackOfBattle: boolean;
  iburiActive: boolean; // 前戦闘ノーミス勝利 × いぶりがっこ
  answerSec: number; // 回答にかかった秒数
  enemyHp: number;
  enemyMaxHp: number;
  radishUsedThisBattle: boolean;
}

export interface AttackResult {
  hits: number[]; // 各ヒットのダメージ（ピストルで2発）
  radishBonus: number; // 5コンボダイコンの追加ダメージ（別枠）
  radishTriggered: boolean;
  jubutsuUsed: boolean; // とっきゅうじゅぶつで即死上書き
  total: number;
}

export function computeAttack(ctx: AttackContext): AttackResult {
  const has = (id: string) => ctx.equipment.includes(id);

  // とっきゅうじゅぶつ: 与ダメージを敵の現在HP（=即死）に上書き
  if (has('n-charm')) {
    return {
      hits: [ctx.enemyHp],
      radishBonus: 0,
      radishTriggered: false,
      jubutsuUsed: true,
      total: ctx.enemyHp,
    };
  }

  let hit = ctx.atk * comboMultiplier(ctx.combo);
  if (has('n-sword')) hit *= 1.1;
  if (has('s-drone')) hit += ctx.atk * 0.5 * ctx.combo;
  if (has('r-poop') && ctx.isFirstAttackOfBattle) hit *= 2;
  if (ctx.iburiActive) hit *= 2;
  if (has('s-nautilus') && ctx.combo >= 10) hit *= 20;
  const rounded = Math.max(0, Math.round(hit));

  const hits =
    has('r-pistol') && ctx.answerSec <= 2 ? [rounded, rounded] : [rounded];

  let radishBonus = 0;
  let radishTriggered = false;
  if (has('s-radish') && ctx.combo >= 5 && !ctx.radishUsedThisBattle) {
    radishBonus = Math.round(ctx.enemyMaxHp * 0.5);
    radishTriggered = true;
  }

  return {
    hits,
    radishBonus,
    radishTriggered,
    jubutsuUsed: false,
    total: hits.reduce((a, b) => a + b, 0) + radishBonus,
  };
}

// ===== ダメージ計算: プレイヤーの被弾（ミス時／カウント0時） =====

export interface DefenseContext {
  enemyAtk: number;
  cause: 'miss' | 'count';
  equipment: string[];
  noMissSoFar: boolean; // この戦闘でまだミスしていない
  coinUsedThisBattle: boolean;
  maxHp: number;
  rng?: Rng;
}

export interface DefenseResult {
  damage: number; // プレイヤーが受けるダメージ
  reflect: number; // しかえしわたがしの反射ダメージ
  coinUsed: boolean; // いかさまコイン発動（ミス扱いなし・コンボ維持）
  waterLost: boolean; // ノーミスの水が消滅した
}

export function computeIncoming(ctx: DefenseContext): DefenseResult {
  const has = (id: string) => ctx.equipment.includes(id);
  const rng = ctx.rng ?? Math.random;

  // いかさまコイン: 各戦闘の最初のミスをなかったことにする（水も消えない）
  if (ctx.cause === 'miss' && has('n-coin') && !ctx.coinUsedThisBattle) {
    return { damage: 0, reflect: 0, coinUsed: true, waterLost: false };
  }

  // ノーミスの水: ミスしていない間の被ダメージは1。ミスによる被弾では守れず消滅する
  let waterLost = false;
  if (has('l-water')) {
    if (ctx.cause === 'miss') {
      waterLost = true; // ミスした瞬間に消える（このダメージは通常計算）
    } else if (ctx.noMissSoFar) {
      const damage = 1;
      const reflect = has('n-candy') ? Math.round(damage * 0.25) : 0;
      return { damage, reflect, coinUsed: false, waterLost: false };
    }
  }

  let dmg = ctx.enemyAtk;
  if (has('n-shield')) dmg *= 0.95;
  if (has('r-autoshield')) dmg *= 0.5;
  dmg = Math.max(0, Math.round(dmg));
  if (has('r-armor') && dmg <= ctx.maxHp * 0.05) dmg = 0;
  if (has('n-cloak') && dmg > 0 && rng() < 0.1) dmg = 0;

  const reflect = has('n-candy') && dmg > 0 ? Math.max(1, Math.round(dmg * 0.25)) : 0;
  return { damage: dmg, reflect, coinUsed: false, waterLost };
}

// ===== その他の効果 =====

/** たべのこし: 正解するたびに最大HPの6.25%回復 */
export function leftoverHeal(equipment: string[], maxHp: number): number {
  return equipment.includes('r-leftover') ? Math.max(1, Math.round(maxHp * 0.0625)) : 0;
}

/** とっきゅうじゅぶつ: 勝利後50%で自滅するか */
export function jubutsuBackfire(equipment: string[], rng: Rng = Math.random): boolean {
  return equipment.includes('n-charm') && rng() < 0.5;
}
