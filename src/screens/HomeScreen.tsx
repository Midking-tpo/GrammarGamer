import { useState } from 'react';
import { LevelBar, Stars } from '../components/bars';
import {
  MODE_ICONS,
  MODE_LABELS,
  MODES,
  summaryStageOf,
  unitsOfGrade,
} from '../data/curriculum';
import { isSummaryUnlocked, isUnitUnlocked } from '../game/unlock';
import { useProgress } from '../store/progressStore';
import type { Grade } from '../types';

interface Props {
  onPlay: (stageId: string) => void;
  onSummary: (grade: Grade) => void;
  onDungeon: () => void;
  onReview: () => void;
  onBadges: () => void;
}

const GRADE_LABELS: Record<Grade, string> = {
  1: '中1ワールド',
  2: '中2ワールド',
  3: '中3ワールド',
};

export function HomeScreen({ onPlay, onSummary, onDungeon, onReview, onBadges }: Props) {
  const { progress, reset } = useProgress();
  const [grade, setGrade] = useState<Grade>(1);
  const summary = summaryStageOf(grade);
  const summaryUnlocked = isSummaryUnlocked(progress, grade);
  const summaryRecord = progress.stages[summary.id];

  function handleReset() {
    if (window.confirm('すべての進捗（XP・☆・バッジ）を消してはじめからにします。よろしいですか？')) {
      reset();
    }
  }

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <h1 className="app-title">⚔️ GrammarQuest</h1>
        <p className="app-subtitle">英文法をゲームで攻略しよう！</p>
        <LevelBar xp={progress.xp} />
      </header>

      <div className="home-actions">
        <button
          className="btn review-btn"
          onClick={onReview}
          disabled={progress.wrongQuestionIds.length === 0}
        >
          💪 にがて復習（{progress.wrongQuestionIds.length}問）
        </button>
        <button className="btn" onClick={onBadges}>
          🏅 バッジ（{progress.badges.length}）
        </button>
      </div>

      <button className="btn dungeon-btn" onClick={onDungeon}>
        <span className="dungeon-btn-title">🏰 ダンジョン</span>
        <span className="dungeon-btn-sub">
          {progress.dungeon.bestFloor > 0
            ? `最高記録: 地下${progress.dungeon.bestFloor}階`
            : '全単元からエンドレスバトル！'}
        </span>
      </button>

      <nav className="grade-tabs">
        {([1, 2, 3] as Grade[]).map((g) => (
          <button
            key={g}
            className={`grade-tab ${grade === g ? 'active' : ''}`}
            onClick={() => setGrade(g)}
          >
            {GRADE_LABELS[g]}
          </button>
        ))}
      </nav>

      <div className="unit-list">
        {unitsOfGrade(grade).map((unit, i) => {
          const unlocked = isUnitUnlocked(progress, unit);
          return (
            <div key={unit.id} className={`unit-card ${unlocked ? '' : 'locked'}`}>
              <div className="unit-head">
                <span className="unit-icon">{unlocked ? unit.icon : '🔒'}</span>
                <span className="unit-title">
                  {i + 1}. {unit.title}
                </span>
              </div>
              {unlocked ? (
                <div className="stage-buttons">
                  {MODES.map((mode) => {
                    const stageId = `${unit.id}-${mode}`;
                    const record = progress.stages[stageId];
                    return (
                      <button key={mode} className="stage-btn" onClick={() => onPlay(stageId)}>
                        <span className="stage-mode">
                          {MODE_ICONS[mode]} {MODE_LABELS[mode]}
                        </span>
                        <Stars stars={record?.stars ?? 0} size="sm" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="locked-note">前の単元をクリアすると解放されるよ</p>
              )}
            </div>
          );
        })}

        <div className={`unit-card summary-card ${summaryUnlocked ? '' : 'locked'}`}>
          <div className="unit-head">
            <span className="unit-icon">{summaryUnlocked ? summary.boss : '🔒'}</span>
            <span className="unit-title">👑 {summary.title}（ワールドボス）</span>
          </div>
          {summaryUnlocked ? (
            <div className="stage-buttons">
              <button className="stage-btn boss" onClick={() => onSummary(grade)}>
                <span className="stage-mode">⚔️ 全単元ミックスでボスに挑む</span>
                <Stars stars={summaryRecord?.stars ?? 0} size="sm" />
              </button>
            </div>
          ) : (
            <p className="locked-note">この学年の全単元をクリアすると挑戦できるよ</p>
          )}
        </div>
      </div>

      <footer className="home-footer">
        <button className="btn ghost small" onClick={handleReset}>
          進捗をリセット
        </button>
      </footer>
    </div>
  );
}
