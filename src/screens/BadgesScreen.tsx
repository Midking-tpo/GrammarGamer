import { BADGES } from '../game/badges';
import { useProgress } from '../store/progressStore';

export function BadgesScreen({ onHome }: { onHome: () => void }) {
  const { progress } = useProgress();

  return (
    <div className="screen badges-screen">
      <header className="game-header">
        <button className="btn ghost small" onClick={onHome}>
          ◀ もどる
        </button>
        <span className="game-title">🏅 バッジコレクション</span>
        <span className="game-progress">
          {progress.badges.length}/{BADGES.length}
        </span>
      </header>

      <div className="badge-grid">
        {BADGES.map((badge) => {
          const earned = progress.badges.includes(badge.id);
          return (
            <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
              <span className="badge-icon big">{earned ? badge.icon : '🔒'}</span>
              <strong>{badge.title}</strong>
              <p>{badge.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
