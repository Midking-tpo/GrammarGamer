import { useMemo, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { QuestionPanel } from '../components/QuestionPanel';
import { questionById } from '../data/questions';
import { pickQuestions, starsFor } from '../game/engine';
import { playClear, playCorrect, playWrong } from '../game/sounds';
import { useSession } from '../game/useSession';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Question } from '../types';

interface Props {
  wrongQuestionIds: string[];
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

export function ReviewScreen({ wrongQuestionIds, onFinish, onQuit }: Props) {
  const questions = useMemo(() => {
    const pool = wrongQuestionIds
      .map(questionById)
      .filter((q): q is Question => q !== undefined);
    return pickQuestions(pool);
    // 開始時点のリストで固定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { index, current, stats, recordAnswer, goNext } = useSession(questions);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  function handleAnswer(isCorrect: boolean) {
    recordAnswer(isCorrect);
    setFeedback(isCorrect);
    if (isCorrect) playCorrect();
    else playWrong();
  }

  function handleNext() {
    setFeedback(null);
    if (!goNext()) {
      playClear();
      onFinish({
        result: {
          stageId: null,
          mode: 'review',
          unitTitle: 'にがて復習',
          total: questions.length,
          correct: stats.correct,
          maxCombo: stats.maxCombo,
          earnedXp: stats.xp,
          stars: starsFor(stats.correct, questions.length),
          defeated: false,
          timeLeft: 0,
          wrongQuestions: stats.wrongQuestions,
        },
        correctIds: stats.correctIds,
        wrongIds: stats.wrongIds,
      });
    }
  }

  if (!current) return null;

  return (
    <div className="screen game-screen">
      <header className="game-header">
        <button className="btn ghost small" onClick={onQuit}>
          ✕ やめる
        </button>
        <span className="game-title">💪 にがて復習</span>
        <span className="game-progress">
          Q{index + 1}/{questions.length}
        </span>
      </header>

      <p className="review-note">前にまちがえた問題だよ。正解すると「にがてリスト」から消えるよ！</p>

      <div className="puzzle-status">
        <span>⭕ {stats.correct}</span>
        <span>❌ {stats.wrong}</span>
      </div>

      <QuestionPanel
        key={current.id}
        question={current}
        answered={feedback !== null}
        onAnswer={handleAnswer}
      />

      {feedback !== null && (
        <Feedback
          question={current}
          isCorrect={feedback}
          onNext={handleNext}
          nextLabel={index + 1 >= questions.length ? 'けっか を見る' : 'つぎへ ▶'}
        />
      )}
    </div>
  );
}
