import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { newBadges } from '../game/badges';
import type { Progress, SessionResult, StageRecord } from '../types';

const STORAGE_KEY = 'grammar-quest-progress-v1';

export const INITIAL_PROGRESS: Progress = {
  version: 1,
  xp: 0,
  stages: {},
  badges: [],
  wrongQuestionIds: [],
  totalCorrect: 0,
  bestCombo: 0,
};

export interface CompleteSessionPayload {
  result: SessionResult;
  correctIds: string[];
  wrongIds: string[];
}

type Action =
  | { type: 'COMPLETE_SESSION'; payload: CompleteSessionPayload }
  | { type: 'RESET' };

export function applySession(
  progress: Progress,
  { result, correctIds, wrongIds }: CompleteSessionPayload,
): Progress {
  const stages = { ...progress.stages };
  if (result.stageId) {
    const prev: StageRecord = stages[result.stageId] ?? { stars: 0, bestScore: 0 };
    stages[result.stageId] = {
      stars: Math.max(prev.stars, result.stars) as StageRecord['stars'],
      bestScore: Math.max(prev.bestScore, result.correct),
    };
  }
  const wrongSet = new Set(progress.wrongQuestionIds);
  for (const id of correctIds) wrongSet.delete(id);
  for (const id of wrongIds) wrongSet.add(id);

  const updated: Progress = {
    ...progress,
    xp: progress.xp + result.earnedXp,
    stages,
    wrongQuestionIds: [...wrongSet],
    totalCorrect: progress.totalCorrect + result.correct,
    bestCombo: Math.max(progress.bestCombo, result.maxCombo),
  };
  return { ...updated, badges: [...updated.badges, ...newBadges(updated, result)] };
}

function reducer(progress: Progress, action: Action): Progress {
  switch (action.type) {
    case 'COMPLETE_SESSION':
      return applySession(progress, action.payload);
    case 'RESET':
      return INITIAL_PROGRESS;
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_PROGRESS;
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.version !== 1) return INITIAL_PROGRESS;
    return { ...INITIAL_PROGRESS, ...parsed };
  } catch {
    return INITIAL_PROGRESS;
  }
}

interface ProgressStore {
  progress: Progress;
  completeSession: (payload: CompleteSessionPayload) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const store: ProgressStore = {
    progress,
    completeSession: (payload) => dispatch({ type: 'COMPLETE_SESSION', payload }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error('useProgress must be used within ProgressProvider');
  return store;
}
