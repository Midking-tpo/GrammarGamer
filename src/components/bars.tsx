import { levelProgress } from '../game/engine';
import type { Stars as StarsType } from '../types';

export function HpBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: 'green' | 'red';
}) {
  return (
    <div className="hp-bar">
      <span className="hp-label">{label}</span>
      <div className="bar-track">
        <div
          className={`bar-fill ${color}`}
          style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
        />
      </div>
      <span className="hp-value">
        {Math.max(0, current)}/{max}
      </span>
    </div>
  );
}

export function TimerBar({ seconds, total }: { seconds: number; total: number }) {
  const ratio = seconds / total;
  const color = ratio > 0.5 ? 'green' : ratio > 0.2 ? 'yellow' : 'red';
  return (
    <div className="timer-bar">
      <span className="timer-value">⏱️ {Math.ceil(seconds)}秒</span>
      <div className="bar-track">
        <div className={`bar-fill ${color}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function Stars({ stars, size = 'md' }: { stars: StarsType; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`stars ${size}`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= stars ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function LevelBar({ xp }: { xp: number }) {
  const { level, current, needed } = levelProgress(xp);
  return (
    <div className="level-bar">
      <span className="level-label">Lv.{level}</span>
      <div className="bar-track">
        <div className="bar-fill blue" style={{ width: `${(current / needed) * 100}%` }} />
      </div>
      <span className="level-xp">
        {current}/{needed} XP
      </span>
    </div>
  );
}
