import { useEffect, useMemo, useRef, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { TimerBar } from '../components/bars';
import { QuestionPanel } from '../components/QuestionPanel';
import { unitById } from '../data/curriculum';
import { questionsForStage } from '../data/questions';
import { pickQuestions, starsFor, TIME_LIMIT, timeBonusXp } from '../game/engine';
import { playClear, playCorrect, playLose, playWrong } from '../game/sounds';
import { useSession } from '../game/useSession';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Stage } from '../types';

interface Props {
  stage: Stage;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

export function TimeAttackScreen({ stage, onFinish, onQuit }: Props) {
  const unit = unitById(stage.unitId);
  const questions = useMemo(
    () => pickQuestions(questionsForStage(unit.id, 'timeattack')),
    [unit.id],
  );
  const { index, current, stats, recordAnswer, goNext } = useSession(questions);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const finishedRef = useRef(false);

  // フィードバック表示中はタイマーを止める
  const running = feedback === null && !finishedRef.current;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, [running]);

  function finish(remaining: number, completedAll: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const stars = starsFor(stats.correct, questions.length);
    if (stars >= 1) playClear();
    else playLose();
    onFinish({
      result: {
        stageId: stage.id,
        mode: 'timeattack',
        unitTitle: unit.title,
        total: questions.length,
        correct: stats.correct,
        maxCombo: stats.maxCombo,
        earnedXp: stats.xp + (completedAll ? timeBonusXp(remaining) : 0),
        stars,
        defeated: false,
        timeLeft: remaining,
        wrongQuestions: stats.wrongQuestions,
      },
      correctIds: stats.correctIds,
      wrongIds: stats.wrongIds,
    });
  }

  // 時間切れ（フィードバック表示中は発火しない）
  useEffect(() => {
    if (timeLeft <= 0 && feedback === null) finish(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, feedback]);

  function handleAnswer(isCorrect: boolean) {
    recordAnswer(isCorrect);
    setFeedback(isCorrect);
    if (isCorrect) playCorrect();
    else playWrong();
  }

  function handleNext() {
    setFeedback(null);
    if (timeLeft <= 0) return finish(0, false);
    if (!goNext()) finish(timeLeft, true);
  }

  if (!current) return null;

  return (
    <div className="screen game-screen">
      <header className="game-header">
        <button className="btn ghost small" onClick={onQuit}>
          ✕ やめる
        </button>
        <span className="game-title">⏱️ {unit.title}</span>
        <span className="game-progress">
          Q{index + 1}/{questions.length}
        </span>
      </header>

      <TimerBar seconds={timeLeft} total={TIME_LIMIT} />

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
