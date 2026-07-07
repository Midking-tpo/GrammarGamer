import { useMemo, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { QuestionPanel } from '../components/QuestionPanel';
import { unitById } from '../data/curriculum';
import { questionsForStage } from '../data/questions';
import { pickQuestions, starsFor } from '../game/engine';
import { playClear, playCorrect, playWrong } from '../game/sounds';
import { useSession } from '../game/useSession';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Stage } from '../types';

interface Props {
  stage: Stage;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

export function PuzzleScreen({ stage, onFinish, onQuit }: Props) {
  const unit = unitById(stage.unitId);
  const questions = useMemo(() => pickQuestions(questionsForStage(unit.id, 'puzzle')), [unit.id]);
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
          stageId: stage.id,
          mode: 'puzzle',
          unitTitle: unit.title,
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
        <span className="game-title">🧱 {unit.title}</span>
        <span className="game-progress">
          Q{index + 1}/{questions.length}
        </span>
      </header>

      <div className="puzzle-status">
        <span>⭕ {stats.correct}</span>
        <span>❌ {stats.wrong}</span>
        {stats.combo >= 2 && <span className="combo-banner">🔥 {stats.combo} コンボ中！</span>}
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
