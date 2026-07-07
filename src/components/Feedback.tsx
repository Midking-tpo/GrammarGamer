import type { Question } from '../types';

export function correctAnswerText(q: Question): string {
  if (q.type === 'order') return q.answer.join(' ');
  return q.choices[q.answer];
}

interface Props {
  question: Question;
  isCorrect: boolean;
  onNext: () => void;
  nextLabel?: string;
}

export function Feedback({ question, isCorrect, onNext, nextLabel = 'つぎへ ▶' }: Props) {
  return (
    <div className={`feedback ${isCorrect ? 'ok' : 'ng'}`}>
      <p className="feedback-title">{isCorrect ? '⭕ せいかい！' : '❌ ざんねん…'}</p>
      {!isCorrect && (
        <p className="feedback-answer">
          正解: <strong>{correctAnswerText(question)}</strong>
        </p>
      )}
      <p className="feedback-explanation">{question.explanation}</p>
      <button className="btn primary" onClick={onNext} autoFocus>
        {nextLabel}
      </button>
    </div>
  );
}
