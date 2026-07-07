import type { GameMode, Question } from '../../types';
import { GRADE1_QUESTIONS } from './grade1';
import { GRADE2_QUESTIONS } from './grade2';
import { GRADE3_QUESTIONS } from './grade3';

export const ALL_QUESTIONS: Question[] = [
  ...GRADE1_QUESTIONS,
  ...GRADE2_QUESTIONS,
  ...GRADE3_QUESTIONS,
];

const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export function questionById(id: string): Question | undefined {
  return byId.get(id);
}

/** モードごとに使う問題タイプ: バトル=choice / パズル=order / タイムアタック=fill */
export const MODE_QUESTION_TYPE: Record<GameMode, Question['type']> = {
  battle: 'choice',
  puzzle: 'order',
  timeattack: 'fill',
};

export function questionsForStage(unitId: string, mode: GameMode): Question[] {
  const type = MODE_QUESTION_TYPE[mode];
  return ALL_QUESTIONS.filter((q) => q.unitId === unitId && q.type === type);
}
