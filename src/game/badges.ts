import { STAGES, UNITS } from '../data/curriculum';
import type { Badge, Progress, SessionResult } from '../types';
import { levelForXp } from './engine';

interface BadgeDef extends Badge {
  check: (progress: Progress, result: SessionResult | null) => boolean;
}

function gradeCleared(progress: Progress, grade: 1 | 2 | 3): boolean {
  const unitIds = new Set(UNITS.filter((u) => u.grade === grade).map((u) => u.id));
  return STAGES.filter((s) => unitIds.has(s.unitId)).every(
    (s) => (progress.stages[s.id]?.stars ?? 0) >= 1,
  );
}

function totalStars(progress: Progress): number {
  return Object.values(progress.stages).reduce((sum, r) => sum + r.stars, 0);
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-clear',
    title: 'はじめの一歩',
    description: 'はじめてステージをクリアした',
    icon: '🐣',
    check: (p) => Object.values(p.stages).some((r) => r.stars >= 1),
  },
  {
    id: 'perfect',
    title: 'パーフェクト',
    description: '1ステージを全問正解でクリアした',
    icon: '💯',
    check: (_, r) => r !== null && r.total > 0 && r.correct === r.total && !r.defeated,
  },
  {
    id: 'combo-10',
    title: 'コンボマスター',
    description: '10問連続で正解した',
    icon: '🔥',
    check: (p, r) => (r?.maxCombo ?? 0) >= 10 || p.bestCombo >= 10,
  },
  {
    id: 'speedster',
    title: 'スピードスター',
    description: 'タイムアタックを残り30秒以上でクリアした',
    icon: '⚡',
    check: (_, r) =>
      r !== null && r.mode === 'timeattack' && r.stars >= 1 && r.timeLeft >= 30,
  },
  {
    id: 'world-1',
    title: '中1ワールド制覇',
    description: '中1の全ステージを☆1以上でクリアした',
    icon: '🥉',
    check: (p) => gradeCleared(p, 1),
  },
  {
    id: 'world-2',
    title: '中2ワールド制覇',
    description: '中2の全ステージを☆1以上でクリアした',
    icon: '🥈',
    check: (p) => gradeCleared(p, 2),
  },
  {
    id: 'world-3',
    title: '中3ワールド制覇',
    description: '中3の全ステージを☆1以上でクリアした',
    icon: '🥇',
    check: (p) => gradeCleared(p, 3),
  },
  {
    id: 'star-30',
    title: 'スターコレクター',
    description: '合計30個の☆を集めた',
    icon: '🌟',
    check: (p) => totalStars(p) >= 30,
  },
  {
    id: 'star-all',
    title: '文法マスター',
    description: '全ステージで☆3を獲得した',
    icon: '👑',
    check: (p) => STAGES.every((s) => (p.stages[s.id]?.stars ?? 0) === 3),
  },
  {
    id: 'level-5',
    title: 'かけだし冒険者',
    description: 'レベル5に到達した',
    icon: '🗡️',
    check: (p) => levelForXp(p.xp) >= 5,
  },
  {
    id: 'level-10',
    title: 'ベテラン冒険者',
    description: 'レベル10に到達した',
    icon: '🛡️',
    check: (p) => levelForXp(p.xp) >= 10,
  },
  {
    id: 'correct-100',
    title: '100問の道',
    description: '累計100問に正解した',
    icon: '📚',
    check: (p) => p.totalCorrect >= 100,
  },
  {
    id: 'reviewer',
    title: 'にがて克服',
    description: 'にがて復習で全問正解した',
    icon: '💪',
    check: (_, r) => r !== null && r.mode === 'review' && r.total > 0 && r.correct === r.total,
  },
];

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

/** 新しく獲得したバッジのidを返す */
export function newBadges(progress: Progress, result: SessionResult | null): string[] {
  return BADGES.filter(
    (b) => !progress.badges.includes(b.id) && b.check(progress, result),
  ).map((b) => b.id);
}
