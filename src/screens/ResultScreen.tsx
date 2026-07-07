import { correctAnswerText } from '../components/Feedback';
import { Stars } from '../components/bars';
import { badgeById } from '../game/badges';
import type { OrderQuestion, SessionResult } from '../types';

interface Props {
  result: SessionResult;
  newBadgeIds: string[];
  onRetry: () => void;
  onHome: () => void;
}

function questionText(q: SessionResult['wrongQuestions'][number]): string {
  if (q.type === 'choice') return q.prompt;
  if (q.type === 'fill') return `${q.sentence}（${q.ja}）`;
  return (q as OrderQuestion).ja;
}

export function ResultScreen({ result, newBadgeIds, onRetry, onHome }: Props) {
  const isReview = result.mode === 'review';
  const cleared = !result.defeated && result.stars >= 1;

  return (
    <div className="screen result-screen">
      <h1 className="result-title">
        {result.defeated ? '😵 やられた…' : cleared ? '🎉 クリア！' : '😢 もう少し！'}
      </h1>
      <p className="result-unit">{result.unitTitle}</p>

      {!isReview && <Stars stars={result.stars} size="lg" />}

      <div className="result-stats">
        <div className="stat">
          <span className="stat-value">
            {result.correct}/{result.total}
          </span>
          <span className="stat-label">正解</span>
        </div>
        <div className="stat">
          <span className="stat-value">{result.maxCombo}</span>
          <span className="stat-label">最大コンボ</span>
        </div>
        <div className="stat">
          <span className="stat-value">+{result.earnedXp}</span>
          <span className="stat-label">XP</span>
        </div>
        {result.mode === 'timeattack' && result.timeLeft > 0 && (
          <div className="stat">
            <span className="stat-value">{Math.round(result.timeLeft)}秒</span>
            <span className="stat-label">残り時間</span>
          </div>
        )}
      </div>

      {newBadgeIds.length > 0 && (
        <div className="new-badges">
          <h2>🏅 新しいバッジ！</h2>
          {newBadgeIds.map((id) => {
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

      {result.wrongQuestions.length > 0 && (
        <div className="wrong-list">
          <h2>📖 まちがえた問題をふりかえろう</h2>
          {result.wrongQuestions.map((q) => (
            <div key={q.id} className="wrong-item">
              <p className="wrong-q">{questionText(q)}</p>
              <p className="wrong-a">
                正解: <strong>{correctAnswerText(q)}</strong>
              </p>
              <p className="wrong-e">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button className="btn primary" onClick={onRetry}>
          🔁 もう一度
        </button>
        <button className="btn" onClick={onHome}>
          🏠 ホームへ
        </button>
      </div>
    </div>
  );
}
