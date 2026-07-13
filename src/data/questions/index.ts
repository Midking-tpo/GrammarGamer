import type { GameMode, Grade, Question } from '../../types';
import { UNITS } from '../curriculum';
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

/** まとめステージ用: 対象学年の全単元・全タイプ（choice/order/fill 混合） */
export function questionsForSummary(grade: Grade): Question[] {
  const unitIds = new Set(UNITS.filter((u) => u.grade === grade).map((u) => u.id));
  return ALL_QUESTIONS.filter((q) => unitIds.has(q.unitId));
}

/** ダンジョン用: 全ワールド全単元の4択問題 */
export function dungeonQuestionPool(): Question[] {
  return ALL_QUESTIONS.filter((q) => q.type === 'choice');
}
