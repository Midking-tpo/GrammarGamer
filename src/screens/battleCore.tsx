import { useMemo, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { HpBar } from '../components/bars';
import { QuestionPanel } from '../components/QuestionPanel';
import { pickQuestions, starsFor } from '../game/engine';
import { playClear, playCorrect, playLose, playWrong } from '../game/sounds';
import { useSession } from '../game/useSession';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Question, SessionResult } from '../types';

export interface BattleConfig {
  headerTitle: string; // ヘッダー表示（アイコン込み）
  unitTitle: string; // リザルトに出す名前
  monster: string;
  stageId: string;
  mode: SessionResult['mode'];
  pool: Question[]; // 出題プール（ここからシャッフル抽出）
  questionCount: number;
  enemyHp: number;
  playerHp: number;
  winBonusXp: number;
}

interface Props {
  config: BattleConfig;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

/** クイズバトル/まとめボス戦の共通コア。正解=敵にダメージ、ミス=被弾 */
export function BattleCore({ config, onFinish, onQuit }: Props) {
  const questions = useMemo(
    () => pickQuestions(config.pool, config.questionCount),
    [config.pool, config.questionCount],
  );
  const { index, current, stats, recordAnswer, goNext } = useSession(questions);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [shake, setShake] = useState<'enemy' | 'player' | null>(null);

  const enemyHp = config.enemyHp - stats.correct;
  const playerHp = config.playerHp - stats.wrong;

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
    onFinish({
      result: {
        stageId: config.stageId,
        mode: config.mode,
        unitTitle: config.unitTitle,
        total: answered,
        correct: stats.correct,
        maxCombo: stats.maxCombo,
        earnedXp: stats.xp + (defeated ? 0 : config.winBonusXp),
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
        <span className="game-title">{config.headerTitle}</span>
        <span className="game-progress">
          Q{index + 1}/{questions.length}
        </span>
      </header>

      <div className="battle-field">
        <div className={`fighter enemy ${shake === 'enemy' ? 'hit' : ''}`}>
          <span className="fighter-emoji">{config.monster}</span>
          <HpBar label="てき" current={enemyHp} max={config.enemyHp} color="red" />
        </div>
        <div className={`fighter player ${shake === 'player' ? 'hit' : ''}`}>
          <span className="fighter-emoji">🧑‍🎓</span>
          <HpBar label="きみ" current={playerHp} max={config.playerHp} color="green" />
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
