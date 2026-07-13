import { useState } from 'react';
import { stageById } from './data/curriculum';
import { applySession, useProgress, type CompleteSessionPayload } from './store/progressStore';
import { BadgesScreen } from './screens/BadgesScreen';
import { BattleScreen } from './screens/BattleScreen';
import { DungeonScreen } from './screens/dungeon/DungeonScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PuzzleScreen } from './screens/PuzzleScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TimeAttackScreen } from './screens/TimeAttackScreen';
import type { Grade, SessionResult } from './types';

type Screen =
  | { name: 'home' }
  | { name: 'game'; stageId: string; playKey: number }
  | { name: 'summary'; grade: Grade; playKey: number }
  | { name: 'review'; playKey: number }
  | { name: 'result'; result: SessionResult; newBadgeIds: string[] }
  | { name: 'badges' }
  | { name: 'dungeon'; playKey: number };

function summaryGradeOf(stageId: string): Grade | null {
  const match = /^summary-g([123])$/.exec(stageId);
  return match ? (Number(match[1]) as Grade) : null;
}

export default function App() {
  const { progress, completeSession } = useProgress();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  function handleFinish(payload: CompleteSessionPayload) {
    const after = applySession(progress, payload);
    const newBadgeIds = after.badges.filter((id) => !progress.badges.includes(id));
    completeSession(payload);
    setScreen({ name: 'result', result: payload.result, newBadgeIds });
  }

  function retry(result: SessionResult) {
    if (result.stageId) {
      const grade = summaryGradeOf(result.stageId);
      if (grade) {
        setScreen({ name: 'summary', grade, playKey: Date.now() });
      } else {
        setScreen({ name: 'game', stageId: result.stageId, playKey: Date.now() });
      }
    } else {
      setScreen({ name: 'review', playKey: Date.now() });
    }
  }

  const goHome = () => setScreen({ name: 'home' });

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          onPlay={(stageId) => setScreen({ name: 'game', stageId, playKey: Date.now() })}
          onSummary={(grade) => setScreen({ name: 'summary', grade, playKey: Date.now() })}
          onDungeon={() => setScreen({ name: 'dungeon', playKey: Date.now() })}
          onReview={() => setScreen({ name: 'review', playKey: Date.now() })}
          onBadges={() => setScreen({ name: 'badges' })}
        />
      );
    case 'game': {
      const stage = stageById(screen.stageId);
      const props = { stage, onFinish: handleFinish, onQuit: goHome };
      if (stage.mode === 'battle') return <BattleScreen key={screen.playKey} {...props} />;
      if (stage.mode === 'puzzle') return <PuzzleScreen key={screen.playKey} {...props} />;
      return <TimeAttackScreen key={screen.playKey} {...props} />;
    }
    case 'summary':
      return (
        <SummaryScreen
          key={screen.playKey}
          grade={screen.grade}
          onFinish={handleFinish}
          onQuit={goHome}
        />
      );
    case 'review':
      return (
        <ReviewScreen
          key={screen.playKey}
          wrongQuestionIds={progress.wrongQuestionIds}
          onFinish={handleFinish}
          onQuit={goHome}
        />
      );
    case 'result':
      return (
        <ResultScreen
          result={screen.result}
          newBadgeIds={screen.newBadgeIds}
          onRetry={() => retry(screen.result)}
          onHome={goHome}
        />
      );
    case 'badges':
      return <BadgesScreen onHome={goHome} />;
    case 'dungeon':
      return <DungeonScreen key={screen.playKey} onHome={goHome} />;
  }
}
