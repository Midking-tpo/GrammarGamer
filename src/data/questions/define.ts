import type { Question } from '../../types';

/** [問題文, 選択肢, 正解index, 解説] */
export type C = [string, string[], number, string];
/** [日本語訳, 正しい語順, 解説] */
export type O = [string, string[], string];
/** [空欄付き英文, 日本語訳, 選択肢, 正解index, 解説] */
export type F = [string, string, string[], number, string];

export function defineUnit(
  unitId: string,
  data: { choice: C[]; order: O[]; fill: F[] },
): Question[] {
  return [
    ...data.choice.map(
      ([prompt, choices, answer, explanation], i): Question => ({
        id: `${unitId}-c${i + 1}`,
        unitId,
        type: 'choice',
        prompt,
        choices,
        answer,
        explanation,
      }),
    ),
    ...data.order.map(
      ([ja, answer, explanation], i): Question => ({
        id: `${unitId}-o${i + 1}`,
        unitId,
        type: 'order',
        ja,
        answer,
        explanation,
      }),
    ),
    ...data.fill.map(
      ([sentence, ja, choices, answer, explanation], i): Question => ({
        id: `${unitId}-f${i + 1}`,
        unitId,
        type: 'fill',
        sentence,
        ja,
        choices,
        answer,
        explanation,
      }),
    ),
  ];
}
