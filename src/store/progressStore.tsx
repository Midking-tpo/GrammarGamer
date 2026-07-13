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

export const INITIAL_DUNGEON_RECORD = {
  bestFloor: 0,
  totalRuns: 0,
  totalGold: 0,
  legendObtained: false,
  noMissWin: false,
} as const;

export const INITIAL_PROGRESS: Progress = {
  version: 2,
  xp: 0,
  stages: {},
  badges: [],
  wrongQuestionIds: [],
  totalCorrect: 0,
  bestCombo: 0,
  dungeon: { ...INITIAL_DUNGEON_RECORD },
};

export interface CompleteSessionPayload {
  result: SessionResult;
  correctIds: string[];
  wrongIds: string[];
}

/** ダンジョンのラン終了（敗北）時に通算記録へ反映する */
export interface CompleteDungeonPayload {
  floorReached: number;
  goldEarned: number;
  correctCount: number;
  maxCombo: number;
  wrongIds: string[];
  legendObtained: boolean;
  noMissWin: boolean;
}

/** ラン終了時のXP: 到達階 × 20 */
export function dungeonXp(floorReached: number): number {
  return Math.max(0, floorReached) * 20;
}

type Action =
  | { type: 'COMPLETE_SESSION'; payload: CompleteSessionPayload }
  | { type: 'COMPLETE_DUNGEON'; payload: CompleteDungeonPayload }
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

export function applyDungeonEnd(
  progress: Progress,
  p: CompleteDungeonPayload,
): Progress {
  const wrongSet = new Set(progress.wrongQuestionIds);
  for (const id of p.wrongIds) wrongSet.add(id);
  const updated: Progress = {
    ...progress,
    xp: progress.xp + dungeonXp(p.floorReached),
    wrongQuestionIds: [...wrongSet],
    totalCorrect: progress.totalCorrect + p.correctCount,
    bestCombo: Math.max(progress.bestCombo, p.maxCombo),
    dungeon: {
      bestFloor: Math.max(progress.dungeon.bestFloor, p.floorReached),
      totalRuns: progress.dungeon.totalRuns + 1,
      totalGold: progress.dungeon.totalGold + p.goldEarned,
      legendObtained: progress.dungeon.legendObtained || p.legendObtained,
      noMissWin: progress.dungeon.noMissWin || p.noMissWin,
    },
  };
  return { ...updated, badges: [...updated.badges, ...newBadges(updated, null)] };
}

function reducer(progress: Progress, action: Action): Progress {
  switch (action.type) {
    case 'COMPLETE_SESSION':
      return applySession(progress, action.payload);
    case 'COMPLETE_DUNGEON':
      return applyDungeonEnd(progress, action.payload);
    case 'RESET':
      return INITIAL_PROGRESS;
  }
}

/** v1 → v2: 既存の進捗（XP・☆・バッジ）を温存して dungeon 記録を補完する */
export function migrate(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return INITIAL_PROGRESS;
  const p = raw as Omit<Partial<Progress>, 'version'> & { version?: number };
  if (p.version !== 1 && p.version !== 2) return INITIAL_PROGRESS;
  return {
    ...INITIAL_PROGRESS,
    ...p,
    version: 2,
    dungeon: { ...INITIAL_DUNGEON_RECORD, ...(p.dungeon ?? {}) },
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_PROGRESS;
    return migrate(JSON.parse(raw));
  } catch {
    return INITIAL_PROGRESS;
  }
}

interface ProgressStore {
  progress: Progress;
  completeSession: (payload: CompleteSessionPayload) => void;
  completeDungeon: (payload: CompleteDungeonPayload) => void;
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
    completeDungeon: (payload) => dispatch({ type: 'COMPLETE_DUNGEON', payload }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error('useProgress must be used within ProgressProvider');
  return store;
}
