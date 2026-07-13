import {
  EQUIPMENT_LIMIT,
  SHOP_REROLL_PRICE,
  attackPrice,
  defensePrice,
  healPrice,
} from '../../game/dungeon';
import { RARITY_LABELS, equipmentById } from '../../data/equipment';
import type { DungeonRun } from '../../types';

interface Props {
  run: DungeonRun;
  onBuyAttack: () => void;
  onBuyDefense: () => void;
  onBuyHeal: () => void;
  onBuyEquipment: (id: string) => void;
  onDiscardEquipment: (id: string) => void;
  onRerollStock: () => void;
  onLeave: () => void;
  onQuit: () => void;
  onExit: () => void;
}

export function DungeonShopView({
  run,
  onBuyAttack,
  onBuyDefense,
  onBuyHeal,
  onBuyEquipment,
  onDiscardEquipment,
  onRerollStock,
  onLeave,
  onQuit,
  onExit,
}: Props) {
  const atkCost = attackPrice(run.atkBought);
  const defCost = defensePrice(run.defBought);
  const healCost = healPrice(run.healBought);
  const equipmentFull = run.equipment.length >= EQUIPMENT_LIMIT;

  return (
    <div className="screen dungeon-screen shop-screen">
      <header className="game-header">
        <div className="header-quit-group">
          <button className="btn ghost small" onClick={onQuit}>
            ✕ ちゅうだん
          </button>
          <button className="btn ghost small" onClick={onExit}>
            🚪 やめる
          </button>
        </div>
        <span className="game-title">🛒 SHOP（地下{run.floor}階）</span>
        <span className="gold-badge">💰 {run.gold}G</span>
      </header>

      <div className="shop-status">
        <span>❤️ {run.hp}/{run.maxHp}</span>
        <span>⚔️ こうげき {run.atk}</span>
      </div>

      <h2 className="shop-heading">アップグレード</h2>
      <div className="shop-upgrades">
        <button className="shop-item" onClick={onBuyAttack} disabled={run.gold < atkCost}>
          <span className="shop-item-icon">⚔️</span>
          <span className="shop-item-name">こうげきアップグレード</span>
          <span className="shop-item-desc">攻撃力 +20</span>
          <span className="shop-item-price">{atkCost}G</span>
        </button>
        <button className="shop-item" onClick={onBuyDefense} disabled={run.gold < defCost}>
          <span className="shop-item-icon">❤️</span>
          <span className="shop-item-name">ぼうぎょアップグレード</span>
          <span className="shop-item-desc">最大HP +50</span>
          <span className="shop-item-price">{defCost}G</span>
        </button>
        <button
          className="shop-item"
          onClick={onBuyHeal}
          disabled={run.gold < healCost || run.hp >= run.maxHp}
        >
          <span className="shop-item-icon">🧪</span>
          <span className="shop-item-name">かいふくセット</span>
          <span className="shop-item-desc">HPを全回復</span>
          <span className="shop-item-price">{healCost}G</span>
        </button>
      </div>

      <h2 className="shop-heading">そうび（{run.equipment.length}/{EQUIPMENT_LIMIT}）</h2>
      {run.equipment.length > 0 && (
        <div className="owned-equipment">
          {run.equipment.map((id) => {
            const eq = equipmentById(id);
            if (!eq) return null;
            return (
              <div key={id} className={`equipment-card owned rarity-${eq.rarity}`}>
                <span className="equipment-icon">{eq.icon}</span>
                <div className="equipment-body">
                  <strong>{eq.name}</strong>
                  <p>{eq.description}</p>
                </div>
                <button className="btn ghost small" onClick={() => onDiscardEquipment(id)}>
                  すてる
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn ghost small reroll-btn"
        onClick={onRerollStock}
        disabled={run.gold < SHOP_REROLL_PRICE}
      >
        🔄 そうびを引き直す（{SHOP_REROLL_PRICE}G）
      </button>

      <div className="shop-stock">
        {(run.shopStock ?? []).length === 0 && (
          <p className="shop-soldout">本日のそうびは売り切れ！</p>
        )}
        {(run.shopStock ?? []).map((id) => {
          const eq = equipmentById(id);
          if (!eq) return null;
          const cannotBuy = run.gold < eq.price || equipmentFull;
          return (
            <div key={id} className={`equipment-card rarity-${eq.rarity}`}>
              <span className="equipment-icon">{eq.icon}</span>
              <div className="equipment-body">
                <span className={`rarity-tag rarity-${eq.rarity}`}>{RARITY_LABELS[eq.rarity]}</span>
                <strong>{eq.name}</strong>
                <p>{eq.description}</p>
              </div>
              <button
                className="btn primary small"
                onClick={() => onBuyEquipment(id)}
                disabled={cannotBuy}
              >
                {eq.price}G
              </button>
            </div>
          );
        })}
        {equipmentFull && (run.shopStock ?? []).length > 0 && (
          <p className="shop-note">そうびがいっぱい！ 買うには先に「すてる」必要があるよ</p>
        )}
      </div>

      <button className="btn primary depart-btn" onClick={onLeave}>
        ⬇️ 地下{run.floor}階へ出発
      </button>
    </div>
  );
}
