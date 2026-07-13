import { describe, expect, it } from 'vitest';
import {
  applyDungeonEnd,
  applySession,
  dungeonXp,
  INITIAL_PROGRESS,
  migrate,
} from './progressStore';
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

  it('まとめステージのクリアでマスターバッジを獲得する', () => {
    const next = applySession(INITIAL_PROGRESS, {
      result: makeResult({ stageId: 'summary-g1', mode: 'summary', stars: 2 }),
      correctIds: [],
      wrongIds: [],
    });
    expect(next.badges).toContain('summary-g1');
    expect(next.stages['summary-g1'].stars).toBe(2);
  });
});

describe('migrate (v1 → v2)', () => {
  it('v1データのXP・☆・バッジを温存して dungeon を補完する', () => {
    const v1 = {
      version: 1,
      xp: 500,
      stages: { 'g1-be-battle': { stars: 3, bestScore: 7 } },
      badges: ['first-clear'],
      wrongQuestionIds: ['g1-be-c1'],
      totalCorrect: 50,
      bestCombo: 8,
    };
    const migrated = migrate(v1);
    expect(migrated.version).toBe(2);
    expect(migrated.xp).toBe(500);
    expect(migrated.stages['g1-be-battle']).toEqual({ stars: 3, bestScore: 7 });
    expect(migrated.badges).toEqual(['first-clear']);
    expect(migrated.dungeon).toEqual({
      bestFloor: 0,
      totalRuns: 0,
      totalGold: 0,
      legendObtained: false,
      noMissWin: false,
    });
  });

  it('未知バージョン・壊れたデータは初期値に戻す', () => {
    expect(migrate({ version: 99 })).toEqual(INITIAL_PROGRESS);
    expect(migrate(null)).toEqual(INITIAL_PROGRESS);
    expect(migrate('junk')).toEqual(INITIAL_PROGRESS);
  });
});

describe('applyDungeonEnd', () => {
  const payload = {
    floorReached: 12,
    goldEarned: 150,
    correctCount: 60,
    maxCombo: 12,
    wrongIds: ['g1-be-c1'],
    legendObtained: true,
    noMissWin: true,
  };

  it('記録・XP・誤答リスト・バッジを更新する', () => {
    const next = applyDungeonEnd(INITIAL_PROGRESS, payload);
    expect(next.dungeon.bestFloor).toBe(12);
    expect(next.dungeon.totalRuns).toBe(1);
    expect(next.dungeon.totalGold).toBe(150);
    expect(next.xp).toBe(dungeonXp(12));
    expect(next.wrongQuestionIds).toContain('g1-be-c1');
    expect(next.badges).toEqual(
      expect.arrayContaining(['dungeon-first', 'dungeon-f10', 'legend-item', 'no-miss-win']),
    );
    expect(next.badges).not.toContain('dungeon-f20');
  });

  it('bestFloor は更新されないなら据え置き', () => {
    const first = applyDungeonEnd(INITIAL_PROGRESS, payload);
    const second = applyDungeonEnd(first, { ...payload, floorReached: 5 });
    expect(second.dungeon.bestFloor).toBe(12);
    expect(second.dungeon.totalRuns).toBe(2);
  });
});
