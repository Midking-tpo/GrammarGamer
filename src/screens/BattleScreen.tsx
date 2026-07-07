import { useMemo, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { HpBar } from '../components/bars';
import { QuestionPanel } from '../components/QuestionPanel';
import { unitById } from '../data/curriculum';
import { questionsForStage } from '../data/questions';
import { ENEMY_HP, PLAYER_HP, pickQuestions, starsFor } from '../game/engine';
import { playClear, playCorrect, playLose, playWrong } from '../game/sounds';
import { useSession } from '../game/useSession';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Stage } from '../types';

const MONSTERS = ['👾', '🐙', '🦖', '🐉', '👹', '🧟', '🦂', '🐍', '🧌', '🦇', '🤖', '🐗'];

function monsterFor(unitId: string): string {
  let hash = 0;
  for (const ch of unitId) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return MONSTERS[hash % MONSTERS.length];
}

interface Props {
  stage: Stage;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

export function BattleScreen({ stage, onFinish, onQuit }: Props) {
  const unit = unitById(stage.unitId);
  const questions = useMemo(() => pickQuestions(questionsForStage(unit.id, 'battle')), [unit.id]);
  const { index, current, stats, recordAnswer, goNext } = useSession(questions);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [shake, setShake] = useState<'enemy' | 'player' | null>(null);

  const enemyHp = ENEMY_HP - stats.correct;
  const playerHp = PLAYER_HP - stats.wrong;

  function handleAnswer(isCorrect: boolean) {
    recordAnswer(isCorrect);
    setFeedback(isCorrect);
    setShake(isCorrect ? 'enemy' : 'player');
    if (isCorrect) playCorrect();
    else playWrong();
  }

  function finish(defeated: boolean) {
    if (defeated) playLose();
    else playClear();
    const answered = stats.correct + stats.wrong;
    const winBonus = defeated ? 0 : 20;
    onFinish({
      result: {
        stageId: stage.id,
        mode: 'battle',
        unitTitle: unit.title,
        total: answered,
        correct: stats.correct,
        maxCombo: stats.maxCombo,
        earnedXp: stats.xp + winBonus,
        stars: starsFor(stats.correct, answered, defeated),
        defeated,
        timeLeft: 0,
        wrongQuestions: stats.wrongQuestions,
      },
      correctIds: stats.correctIds,
      wrongIds: stats.wrongIds,
    });
  }

  function handleNext() {
    setFeedback(null);
    setShake(null);
    if (enemyHp <= 0) return finish(false);
    if (playerHp <= 0) return finish(true);
    if (!goNext()) finish(playerHp <= 0);
  }

  if (!current) return null;

  return (
    <div className="screen game-screen">
      <header className="game-header">
        <button className="btn ghost small" onClick={onQuit}>
          ✕ やめる
        </button>
        <span className="game-title">⚔️ {unit.title}</span>
        <span className="game-progress">
          Q{index + 1}/{questions.length}
        </span>
      </header>

      <div className="battle-field">
        <div className={`fighter enemy ${shake === 'enemy' ? 'hit' : ''}`}>
          <span className="fighter-emoji">{monsterFor(unit.id)}</span>
          <HpBar label="てき" current={enemyHp} max={ENEMY_HP} color="red" />
        </div>
        <div className={`fighter player ${shake === 'player' ? 'hit' : ''}`}>
          <span className="fighter-emoji">🧑‍🎓</span>
          <HpBar label="きみ" current={playerHp} max={PLAYER_HP} color="green" />
        </div>
      </div>

      {stats.combo >= 2 && feedback === null && (
        <p className="combo-banner">🔥 {stats.combo} コンボ中！</p>
      )}

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
          nextLabel={
            enemyHp <= 0 ? '🎉 とどめ！' : playerHp <= 0 ? 'けっか を見る' : 'つぎへ ▶'
          }
        />
      )}
    </div>
  );
}
