import { useEffect, useState } from 'react';
import { equipmentById } from '../../data/equipment';
import { badgeById } from '../../game/badges';
import {
  SHOP_INTERVAL,
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
import type { DungeonRun } from '../../types';
import { DungeonBattleView, type BattleOutcome } from './DungeonBattleView';
import { DungeonShopView } from './DungeonShopView';

const RUN_KEY = 'grammar-quest-dungeon-run-v1';

function loadRun(): DungeonRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    return { ...newRun(), ...(JSON.parse(raw) as DungeonRun) };
  } catch {
    return null;
  }
}

interface VictoryInfo {
  floorCleared: number;
  goldGained: number;
  noMiss: boolean;
  shopNext: boolean;
}

interface GameOverInfo {
  floorReached: number;
  goldEarned: number;
  totalCorrect: number;
  newBadgeIds: string[];
  isNewRecord: boolean;
  earnedXp: number;
  byJubutsu: boolean;
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
  const [run, setRun] = useState<DungeonRun>(() => loadRun() ?? newRun());
  const [view, setView] = useState<View>(() =>
    run.phase === 'shop' ? { name: 'shop' } : { name: 'battle' },
  );

  // ラン永続化（ゲームオーバー後はクリア済みなので触らない）
  useEffect(() => {
    if (view.name !== 'gameover') {
      localStorage.setItem(RUN_KEY, JSON.stringify(run));
    }
  }, [run, view]);

  function endRun(finalRun: DungeonRun, floorReached: number, byJubutsu: boolean) {
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
        byJubutsu,
      },
    });
  }

  function handleOutcome(o: BattleOutcome) {
    const merged: DungeonRun = {
      ...run,
      equipment: o.equipment,
      wrongQuestionIds: [...run.wrongQuestionIds, ...o.wrongIds],
      totalCorrect: run.totalCorrect + o.correctCount,
      maxCombo: Math.max(run.maxCombo, o.maxComboInBattle),
      hadNoMissWin: run.hadNoMissWin || (o.won && o.noMiss),
    };

    if (!o.won) {
      return endRun(merged, run.floor, false);
    }

    const battlesCleared = run.battlesCleared + 1;
    const shopNext = battlesCleared % SHOP_INTERVAL === 0;
    const next: DungeonRun = {
      ...merged,
      hp: o.playerHp,
      combo: o.combo,
      gold: run.gold + o.goldGained,
      goldEarned: run.goldEarned + o.goldGained,
      battlesCleared,
      floor: run.floor + 1,
      nextBattleDoubleDamage: o.noMiss && o.equipment.includes('s-iburi'),
      phase: shopNext ? 'shop' : 'battle',
      shopStock: shopNext
        ? drawShopEquipment(o.equipment).map((e) => e.id)
        : null,
    };
    setRun(next);

    if (o.jubutsuDeath) {
      return endRun(next, run.floor, true);
    }

    setView({
      name: 'victory',
      info: {
        floorCleared: run.floor,
        goldGained: o.goldGained,
        noMiss: o.noMiss,
        shopNext,
      },
    });
  }

  function proceedFromVictory(info: VictoryInfo) {
    setView(info.shopNext ? { name: 'shop' } : { name: 'battle' });
  }

  // ===== SHOP操作（価格・在庫は run に保持） =====

  function buy(cost: number, patch: (r: DungeonRun) => Partial<DungeonRun>) {
    setRun((r) => (r.gold < cost ? r : { ...r, gold: r.gold - cost, ...patch(r) }));
  }

  const shopHandlers = {
    onBuyAttack: () =>
      buy(attackPrice(run.atkBought), (r) => ({ atk: r.atk + 2, atkBought: r.atkBought + 1 })),
    onBuyDefense: () =>
      buy(defensePrice(run.defBought), (r) => ({
        maxHp: r.maxHp + 5,
        hp: r.hp + 5,
        defBought: r.defBought + 1,
      })),
    onBuyHeal: () =>
      buy(healPrice(run.healBought), (r) => ({ hp: r.maxHp, healBought: r.healBought + 1 })),
    onBuyEquipment: (id: string) => {
      const eq = equipmentById(id);
      if (!eq || run.equipment.length >= 3) return;
      buy(eq.price, (r) => ({
        equipment: [...r.equipment, id],
        shopStock: (r.shopStock ?? []).filter((s) => s !== id),
        usedLegend: r.usedLegend || eq.rarity === 'legend',
      }));
    },
    onDiscardEquipment: (id: string) =>
      setRun((r) => ({ ...r, equipment: r.equipment.filter((e) => e !== id) })),
    onLeave: () => {
      setRun((r) => ({ ...r, phase: 'battle', shopStock: null }));
      setView({ name: 'battle' });
    },
  };

  switch (view.name) {
    case 'battle':
      return (
        <DungeonBattleView
          key={`${run.floor}-${run.battlesCleared}`}
          run={run}
          onOutcome={handleOutcome}
          onQuit={onHome}
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
                {run.hp}/{run.maxHp}
              </span>
              <span className="stat-label">HP（回復しない）</span>
            </div>
          </div>
          {view.info.noMiss && <p className="victory-note">✨ ノーミス勝利！</p>}
          <div className="result-actions">
            <button className="btn primary" onClick={() => proceedFromVictory(view.info)} autoFocus>
              {view.info.shopNext ? '🛒 SHOPへ' : `⬇️ 地下${run.floor}階へ`}
            </button>
            <button className="btn" onClick={onHome}>
              🏠 ちゅうだん（続きから再開できる）
            </button>
          </div>
        </div>
      );
    case 'shop':
      return <DungeonShopView run={run} onQuit={onHome} {...shopHandlers} />;
    case 'gameover': {
      const info = view.info;
      return (
        <div className="screen dungeon-screen gameover-screen">
          <h1 className="result-title">{info.byJubutsu ? '🧿 じゅぶつの代償…' : '💀 ちから尽きた…'}</h1>
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
            <button
              className="btn primary"
              onClick={() => {
                const fresh = newRun();
                setRun(fresh);
                setView({ name: 'battle' });
              }}
            >
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
