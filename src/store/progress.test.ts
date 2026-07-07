import { describe, expect, it } from 'vitest';
import { applySession, INITIAL_PROGRESS } from './progressStore';
import type { SessionResult } from '../types';

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    stageId: 'g1-be-battle',
    mode: 'battle',
    unitTitle: 'be動詞',
    total: 10,
    correct: 8,
    maxCombo: 5,
    earnedXp: 100,
    stars: 2,
    defeated: false,
    timeLeft: 0,
    wrongQuestions: [],
    ...overrides,
  };
}

describe('applySession', () => {
  it('XP・ステージ記録・誤答リストを更新する', () => {
    const next = applySession(INITIAL_PROGRESS, {
      result: makeResult(),
      correctIds: ['g1-be-c1'],
      wrongIds: ['g1-be-c2', 'g1-be-c3'],
    });
    expect(next.xp).toBe(100);
    expect(next.stages['g1-be-battle']).toEqual({ stars: 2, bestScore: 8 });
    expect(next.wrongQuestionIds).toEqual(['g1-be-c2', 'g1-be-c3']);
    expect(next.totalCorrect).toBe(8);
    expect(next.badges).toContain('first-clear');
  });

  it('☆とベストスコアは既存記録より良いときだけ更新', () => {
    const first = applySession(INITIAL_PROGRESS, {
      result: makeResult({ stars: 3, correct: 9 }),
      correctIds: [],
      wrongIds: [],
    });
    const second = applySession(first, {
      result: makeResult({ stars: 1, correct: 5 }),
      correctIds: [],
      wrongIds: [],
    });
    expect(second.stages['g1-be-battle']).toEqual({ stars: 3, bestScore: 9 });
  });

  it('正解した問題は誤答リストから消える（にがて復習）', () => {
    const withWrong = {
      ...INITIAL_PROGRESS,
      wrongQuestionIds: ['g1-be-c1', 'g1-be-c2'],
    };
    const next = applySession(withWrong, {
      result: makeResult({ stageId: null, mode: 'review' }),
      correctIds: ['g1-be-c1'],
      wrongIds: [],
    });
    expect(next.wrongQuestionIds).toEqual(['g1-be-c2']);
  });

  it('復習(stageId=null)ではステージ記録を作らない', () => {
    const next = applySession(INITIAL_PROGRESS, {
      result: makeResult({ stageId: null, mode: 'review' }),
      correctIds: [],
      wrongIds: [],
    });
    expect(Object.keys(next.stages)).toHaveLength(0);
  });

  it('パーフェクトでバッジを獲得する', () => {
    const next = applySession(INITIAL_PROGRESS, {
      result: makeResult({ correct: 10, total: 10, stars: 3 }),
      correctIds: [],
      wrongIds: [],
    });
    expect(next.badges).toContain('perfect');
  });
});
