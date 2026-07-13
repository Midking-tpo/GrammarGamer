import { useEffect, useState } from 'react';
import { equipmentById } from '../../data/equipment';
import { badgeById } from '../../game/badges';
import {
  COMBO_GOLD_BONUS_MULTIPLIER,
  EASY_MODE_STARTING_GOLD,
  MODE_ASSUMED_ANSWER_SEC,
  SHOP_INTERVAL,
  SHOP_REROLL_PRICE,
  attackPrice,
  defensePrice,
  drawShopEquipment,
  healPrice,
  newRun,
} from '../../game/dungeon';
import {
  applyDungeonEnd,
  dungeonXp,
  useProgress,
  type CompleteDungeonPayload,
} from '../../store/progressStore';
import type { DungeonMode, DungeonRun } from '../../types';
import { DungeonBattleView, type BattleOutcome } from './DungeonBattleView';
import { DungeonShopView } from './DungeonShopView';

const RUN_KEY = 'grammar-quest-dungeon-run-v1';

function loadRun(): DungeonRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DungeonRun>;
    const mode: DungeonMode = parsed.mode === 'easy' ? 'easy' : 'hard';
    return { ...newRun(mode), ...parsed };
  } catch {
    return null;
  }
}

interface VictoryInfo {
  floorCleared: number;
  goldGained: number;
  comboBonus: boolean;
  noMiss: boolean;
  shopNext: boolean;
}

type EndReason = 'defeat' | 'jubutsu' | 'quit';

interface GameOverInfo {
  floorReached: number;
  goldEarned: number;
  totalCorrect: number;
  newBadgeIds: string[];
  isNewRecord: boolean;
  earnedXp: number;
  reason: EndReason;
}

type View =
  | { name: 'battle' }
  | { name: 'victory'; info: VictoryInfo }
  | { name: 'shop' }
  | { name: 'gameover'; info: GameOverInfo };

interface Props {
  onHome: () => void;
}

export function DungeonScreen({ onHome }: Props) {
  const { progress, completeDungeon } = useProgress();
  const [run, setRun] = useState<DungeonRun | null>(() => loadRun());
  const [view, setView] = useState<View>(() =>
    run?.phase === 'shop' ? { name: 'shop' } : { name: 'battle' },
  );

  // ラン永続化（ゲームオーバー後はクリア済みなので触らない）
  useEffect(() => {
    if (run && view.name !== 'gameover') {
      localStorage.setItem(RUN_KEY, JSON.stringify(run));
    }
  }, [run, view]);

  function startRun(mode: DungeonMode) {
    const fresh = newRun(mode);
    setRun(fresh);
    setView(fresh.phase === 'shop' ? { name: 'shop' } : { name: 'battle' });
  }

  if (!run) {
    return (
      <div className="screen dungeon-screen mode-select-screen">
        <header className="game-header">
          <button className="btn ghost small" onClick={onHome}>
            ✕ もどる
          </button>
          <span className="game-title">🏰 ダンジョン</span>
        </header>
        <h1 className="result-title">むずかしさを選ぼう</h1>
        <p className="result-unit">1問あたりの回答スピードに合わせて選んでね</p>
        <div className="mode-select-cards">
          <button className="mode-card" onClick={() => startRun('easy')}>
            <span className="mode-card-title">🟢 イージー</span>
            <span className="mode-card-desc">
              1問{MODE_ASSUMED_ANSWER_SEC.easy}秒くらいでじっくり考えたい人向け。
              最初の戦闘の前に{EASY_MODE_STARTING_GOLD}GでSHOPを利用できる。
            </span>
          </button>
          <button className="mode-card" onClick={() => startRun('hard')}>
            <span className="mode-card-title">🔴 ハード</span>
            <span className="mode-card-desc">
              1問{MODE_ASSUMED_ANSWER_SEC.hard}秒くらいでテンポよく答えられる人向け。
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ここから先は run が確定して存在する（null になり得ない）ことを示す別名
  const activeRun = run;

  function endRun(finalRun: DungeonRun, floorReached: number, reason: EndReason) {
    const payload: CompleteDungeonPayload = {
      floorReached,
      goldEarned: finalRun.goldEarned,
      correctCount: finalRun.totalCorrect,
      maxCombo: finalRun.maxCombo,
      wrongIds: finalRun.wrongQuestionIds,
      legendObtained: finalRun.usedLegend,
      noMissWin: finalRun.hadNoMissWin,
    };
    const after = applyDungeonEnd(progress, payload);
    const newBadgeIds = after.badges.filter((id) => !progress.badges.includes(id));
    completeDungeon(payload);
    localStorage.removeItem(RUN_KEY);
    setView({
      name: 'gameover',
      info: {
        floorReached,
        goldEarned: finalRun.goldEarned,
        totalCorrect: finalRun.totalCorrect,
        newBadgeIds,
        isNewRecord: floorReached > progress.dungeon.bestFloor,
        earnedXp: dungeonXp(floorReached),
        reason,
      },
    });
  }

  // 中断（続きから再開できる）ではなく、ランを完全に終了する
  function handleExit(floorReached: number) {
    if (!window.confirm('ダンジョンから出ますか？ 今のランはここで終了し、記録が保存されます。')) {
      return;
    }
    endRun(activeRun, floorReached, 'quit');
  }

  function handleOutcome(o: BattleOutcome) {
    const merged: DungeonRun = {
      ...activeRun,
      equipment: o.equipment,
      wrongQuestionIds: [...activeRun.wrongQuestionIds, ...o.wrongIds],
      totalCorrect: activeRun.totalCorrect + o.correctCount,
      maxCombo: Math.max(activeRun.maxCombo, o.maxComboInBattle),
      hadNoMissWin: activeRun.hadNoMissWin || (o.won && o.noMiss),
    };

    if (!o.won) {
      return endRun(merged, activeRun.floor, 'defeat');
    }

    const battlesCleared = activeRun.battlesCleared + 1;
    const shopNext = battlesCleared % SHOP_INTERVAL === 0;
    const next: DungeonRun = {
      ...merged,
      hp: o.playerHp,
      combo: 0, // コンボは戦闘毎にリセットする（毎戦闘の10コンボ到達を意味あるものにするため）
      gold: activeRun.gold + o.goldGained,
      goldEarned: activeRun.goldEarned + o.goldGained,
      battlesCleared,
      floor: activeRun.floor + 1,
      nextBattleDoubleDamage: o.noMiss && o.equipment.includes('s-iburi'),
      phase: shopNext ? 'shop' : 'battle',
      shopStock: shopNext
        ? drawShopEquipment(o.equipment).map((e) => e.id)
        : null,
    };
    setRun(next);

    if (o.jubutsuDeath) {
      return endRun(next, activeRun.floor, 'jubutsu');
    }

    setView({
      name: 'victory',
      info: {
        floorCleared: activeRun.floor,
        goldGained: o.goldGained,
        comboBonus: o.comboBonus,
        noMiss: o.noMiss,
        shopNext,
      },
    });
  }

  function proceedFromVictory(info: VictoryInfo) {
    setView(info.shopNext ? { name: 'shop' } : { name: 'battle' });
  }

  // ===== SHOP操作（価格・在庫は activeRun に保持） =====

  function buy(cost: number, patch: (r: DungeonRun) => Partial<DungeonRun>) {
    if (activeRun.gold < cost) return;
    setRun({ ...activeRun, gold: activeRun.gold - cost, ...patch(activeRun) });
  }

  const shopHandlers = {
    onBuyAttack: () =>
      buy(attackPrice(activeRun.atkBought), (r) => ({
        atk: r.atk + 20,
        atkBought: r.atkBought + 1,
      })),
    onBuyDefense: () =>
      buy(defensePrice(activeRun.defBought), (r) => ({
        maxHp: r.maxHp + 50,
        hp: r.hp + 50,
        defBought: r.defBought + 1,
      })),
    onBuyHeal: () =>
      buy(healPrice(activeRun.healBought), (r) => ({ hp: r.maxHp, healBought: r.healBought + 1 })),
    onBuyEquipment: (id: string) => {
      const eq = equipmentById(id);
      if (!eq || activeRun.equipment.length >= 3) return;
      buy(eq.price, (r) => ({
        equipment: [...r.equipment, id],
        shopStock: (r.shopStock ?? []).filter((s) => s !== id),
        usedLegend: r.usedLegend || eq.rarity === 'legend',
      }));
    },
    onDiscardEquipment: (id: string) =>
      setRun({ ...activeRun, equipment: activeRun.equipment.filter((e) => e !== id) }),
    onRerollStock: () =>
      buy(SHOP_REROLL_PRICE, (r) => ({
        shopStock: drawShopEquipment(r.equipment).map((e) => e.id),
      })),
    onLeave: () => {
      setRun({ ...activeRun, phase: 'battle', shopStock: null });
      setView({ name: 'battle' });
    },
  };

  switch (view.name) {
    case 'battle':
      return (
        <DungeonBattleView
          key={`${activeRun.floor}-${activeRun.battlesCleared}`}
          run={activeRun}
          onOutcome={handleOutcome}
          onQuit={onHome}
          onExit={() => handleExit(activeRun.floor)}
        />
      );
    case 'victory':
      return (
        <div className="screen dungeon-screen victory-screen">
          <h1 className="result-title">⚔️ 勝利！</h1>
          <p className="result-unit">地下{view.info.floorCleared}階を突破</p>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-value">+{view.info.goldGained}G</span>
              <span className="stat-label">ゴールド</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {activeRun.hp}/{activeRun.maxHp}
              </span>
              <span className="stat-label">HP（回復しない）</span>
            </div>
          </div>
          {view.info.noMiss && <p className="victory-note">✨ ノーミス勝利！</p>}
          {view.info.comboBonus && (
            <p className="victory-note">⭐ 10コンボ達成！ ゴールド{COMBO_GOLD_BONUS_MULTIPLIER}倍！</p>
          )}
          <div className="result-actions">
            <button className="btn primary" onClick={() => proceedFromVictory(view.info)} autoFocus>
              {view.info.shopNext ? '🛒 SHOPへ' : `⬇️ 地下${activeRun.floor}階へ`}
            </button>
            <button className="btn" onClick={onHome}>
              🏠 ちゅうだん（続きから再開できる）
            </button>
            <button
              className="btn ghost small"
              onClick={() => handleExit(view.info.floorCleared)}
            >
              🚪 ダンジョンから出る
            </button>
          </div>
        </div>
      );
    case 'shop':
      return (
        <DungeonShopView
          run={activeRun}
          onQuit={onHome}
          onExit={() => handleExit(activeRun.floor - 1)}
          {...shopHandlers}
        />
      );
    case 'gameover': {
      const info = view.info;
      return (
        <div className="screen dungeon-screen gameover-screen">
          <h1 className="result-title">
            {info.reason === 'jubutsu'
              ? '🧿 じゅぶつの代償…'
              : info.reason === 'quit'
                ? '🚪 ダンジョンから出た'
                : '💀 ちから尽きた…'}
          </h1>
          <p className="result-unit">
            地下{info.floorReached}階まで到達
            {info.isNewRecord && <strong className="new-record"> 🎊 新記録！</strong>}
          </p>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-value">{info.floorReached}階</span>
              <span className="stat-label">到達</span>
            </div>
            <div className="stat">
              <span className="stat-value">{info.goldEarned}G</span>
              <span className="stat-label">獲得ゴールド</span>
            </div>
            <div className="stat">
              <span className="stat-value">{info.totalCorrect}</span>
              <span className="stat-label">正解数</span>
            </div>
            <div className="stat">
              <span className="stat-value">+{info.earnedXp}</span>
              <span className="stat-label">XP</span>
            </div>
          </div>
          {info.newBadgeIds.length > 0 && (
            <div className="new-badges">
              <h2>🏅 新しいバッジ！</h2>
              {info.newBadgeIds.map((id) => {
                const badge = badgeById(id);
                return badge ? (
                  <p key={id} className="badge-row">
                    <span className="badge-icon">{badge.icon}</span>
                    <strong>{badge.title}</strong> — {badge.description}
                  </p>
                ) : null;
              })}
            </div>
          )}
          <div className="result-actions">
            <button className="btn primary" onClick={() => startRun(activeRun.mode)}>
              🔁 もう一度挑戦
            </button>
            <button className="btn" onClick={onHome}>
              🏠 ホームへ
            </button>
          </div>
        </div>
      );
    }
  }
}
