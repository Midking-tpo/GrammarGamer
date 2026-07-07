import { useState } from 'react';
import type { Question } from '../types';
import { xpForCorrect } from './engine';

export interface SessionStats {
  correct: number;
  wrong: number;
  combo: number;
  maxCombo: number;
  xp: number;
  correctIds: string[];
  wrongIds: string[];
  wrongQuestions: Question[];
}

const INITIAL: SessionStats = {
  correct: 0,
  wrong: 0,
  combo: 0,
  maxCombo: 0,
  xp: 0,
  correctIds: [],
  wrongIds: [],
  wrongQuestions: [],
};

/** 出題の進行・正誤カウント・コンボ・XPを管理する共通フック */
export function useSession(questions: Question[]) {
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState(INITIAL);

  const current: Question | undefined = questions[index];

  function recordAnswer(isCorrect: boolean) {
    if (!current) return;
    setStats((s) => {
      if (isCorrect) {
        const combo = s.combo + 1;
        return {
          ...s,
          correct: s.correct + 1,
          combo,
          maxCombo: Math.max(s.maxCombo, combo),
          xp: s.xp + xpForCorrect(combo),
          correctIds: [...s.correctIds, current.id],
        };
      }
      return {
        ...s,
        wrong: s.wrong + 1,
        combo: 0,
        wrongIds: [...s.wrongIds, current.id],
        wrongQuestions: [...s.wrongQuestions, current],
      };
    });
  }

  /** 次の問題へ。もう問題がなければ false を返す */
  function goNext(): boolean {
    if (index + 1 >= questions.length) return false;
    setIndex(index + 1);
    return true;
  }

  return { index, current, stats, recordAnswer, goNext };
}
