import { describe, expect, it } from 'vitest';
import {
  checkOrder,
  levelForXp,
  levelProgress,
  pickQuestions,
  shuffleChoices,
  shuffledWords,
  starsFor,
  timeBonusXp,
  xpForCorrect,
  QUESTIONS_PER_STAGE,
} from './engine';
import type { OrderQuestion } from '../types';

describe('starsFor', () => {
  it('正答率で☆を計算する', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(6, 10)).toBe(1);
    expect(starsFor(5, 10)).toBe(1);
    expect(starsFor(4, 10)).toBe(0);
    expect(starsFor(0, 10)).toBe(0);
  });

  it('バトル敗北時は☆0', () => {
    expect(starsFor(9, 10, true)).toBe(0);
  });

  it('0問のときは☆0', () => {
    expect(starsFor(0, 0)).toBe(0);
  });
});

describe('xpForCorrect', () => {
  it('コンボでボーナスが増える（上限あり）', () => {
    expect(xpForCorrect(1)).toBe(10);
    expect(xpForCorrect(2)).toBe(12);
    expect(xpForCorrect(6)).toBe(20);
    expect(xpForCorrect(10)).toBe(20); // 上限
  });
});

describe('levelForXp / levelProgress', () => {
  it('レベル計算が一貫している', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2); // Lv1→2 は 100XP
    expect(levelForXp(100 + 150)).toBe(3); // Lv2→3 は 150XP
  });

  it('levelProgress は現レベル内の進捗を返す', () => {
    const p = levelProgress(120);
    expect(p.level).toBe(2);
    expect(p.current).toBe(20);
    expect(p.needed).toBe(150);
  });
});

describe('timeBonusXp', () => {
  it('残り秒数がそのままボーナスXPになる', () => {
    expect(timeBonusXp(30.4)).toBe(30);
    expect(timeBonusXp(0)).toBe(0);
    expect(timeBonusXp(-5)).toBe(0);
  });
});

describe('checkOrder', () => {
  it('語順が完全一致で正解', () => {
    expect(checkOrder(['I', 'am', 'Ken.'], ['I', 'am', 'Ken.'])).toBe(true);
    expect(checkOrder(['am', 'I', 'Ken.'], ['I', 'am', 'Ken.'])).toBe(false);
    expect(checkOrder(['I', 'am'], ['I', 'am', 'Ken.'])).toBe(false);
  });
});

describe('shuffleChoices', () => {
  it('シャッフル後も正解が保たれる', () => {
    for (let i = 0; i < 20; i++) {
      const { choices, answer } = shuffleChoices(['a', 'b', 'c', 'd'], 2);
      expect(choices[answer]).toBe('c');
      expect([...choices].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });
});

describe('shuffledWords', () => {
  it('正解と同じ並びを返さない', () => {
    const q: OrderQuestion = {
      id: 't',
      unitId: 't',
      type: 'order',
      ja: 'テスト',
      answer: ['I', 'am', 'a', 'student.'],
      explanation: '',
    };
    for (let i = 0; i < 20; i++) {
      const words = shuffledWords(q);
      expect(words.join(' ')).not.toBe(q.answer.join(' '));
      expect([...words].sort()).toEqual([...q.answer].sort());
    }
  });
});

describe('pickQuestions', () => {
  it('最大10問を重複なく選ぶ', () => {
    const pool = Array.from({ length: 15 }, (_, i) => ({
      id: `q${i}`,
      unitId: 'u',
      type: 'choice' as const,
      prompt: '',
      choices: ['a', 'b'],
      answer: 0,
      explanation: '',
    }));
    const picked = pickQuestions(pool);
    expect(picked).toHaveLength(QUESTIONS_PER_STAGE);
    expect(new Set(picked.map((q) => q.id)).size).toBe(QUESTIONS_PER_STAGE);
  });
});
