import { useState } from 'react';
import { stageById } from './data/curriculum';
import { applySession, useProgress, type CompleteSessionPayload } from './store/progressStore';
import { BadgesScreen } from './screens/BadgesScreen';
import { BattleScreen } from './screens/BattleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PuzzleScreen } from './screens/PuzzleScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { TimeAttackScreen } from './screens/TimeAttackScreen';
import type { SessionResult } from './types';

type Screen =
  | { name: 'home' }
  | { name: 'game'; stageId: string; playKey: number }
  | { name: 'review'; playKey: number }
  | { name: 'result'; result: SessionResult; newBadgeIds: string[] }
  | { name: 'badges' };

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
      setScreen({ name: 'game', stageId: result.stageId, playKey: Date.now() });
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
  }
}
