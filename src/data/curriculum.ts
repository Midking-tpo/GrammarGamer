import type { GameMode, Stage, Unit } from '../types';

export const UNITS: Unit[] = [
  // 中1ワールド
  { id: 'g1-be', grade: 1, title: 'be動詞', icon: '🌱' },
  { id: 'g1-verb', grade: 1, title: '一般動詞', icon: '⚽' },
  { id: 'g1-wh', grade: 1, title: '疑問詞', icon: '❓' },
  { id: 'g1-3rd', grade: 1, title: '三人称単数現在', icon: '👤' },
  { id: 'g1-pron', grade: 1, title: '代名詞', icon: '🙋' },
  { id: 'g1-prog', grade: 1, title: '現在進行形', icon: '🏃' },
  { id: 'g1-can', grade: 1, title: '助動詞 can', icon: '💪' },
  { id: 'g1-past', grade: 1, title: '過去形', icon: '⏪' },
  // 中2ワールド
  { id: 'g2-future', grade: 2, title: '未来表現', icon: '🚀' },
  { id: 'g2-modal', grade: 2, title: '助動詞', icon: '🔑' },
  { id: 'g2-toinf', grade: 2, title: '不定詞', icon: '🎯' },
  { id: 'g2-gerund', grade: 2, title: '動名詞', icon: '🎨' },
  { id: 'g2-conj', grade: 2, title: '接続詞', icon: '🔗' },
  { id: 'g2-there', grade: 2, title: 'There is 構文', icon: '🏠' },
  { id: 'g2-comp', grade: 2, title: '比較', icon: '⚖️' },
  { id: 'g2-passive', grade: 2, title: '受動態', icon: '🔄' },
  // 中3ワールド
  { id: 'g3-perfect', grade: 3, title: '現在完了', icon: '✅' },
  { id: 'g3-perfprog', grade: 3, title: '現在完了進行形', icon: '⏳' },
  { id: 'g3-infadv', grade: 3, title: '不定詞の応用', icon: '🧭' },
  { id: 'g3-part', grade: 3, title: '分詞の修飾', icon: '✨' },
  { id: 'g3-rel', grade: 3, title: '関係代名詞', icon: '🧩' },
  { id: 'g3-indq', grade: 3, title: '間接疑問文', icon: '💬' },
  { id: 'g3-subj', grade: 3, title: '仮定法', icon: '🌙' },
  { id: 'g3-caus', grade: 3, title: '原形不定詞・使役', icon: '🎬' },
];

export const MODES: GameMode[] = ['battle', 'puzzle', 'timeattack'];

export const MODE_LABELS: Record<GameMode, string> = {
  battle: 'クイズバトル',
  puzzle: '並べ替えパズル',
  timeattack: 'タイムアタック',
};

export const MODE_ICONS: Record<GameMode, string> = {
  battle: '⚔️',
  puzzle: '🧱',
  timeattack: '⏱️',
};

export const STAGES: Stage[] = UNITS.flatMap((unit) =>
  MODES.map((mode) => ({ id: `${unit.id}-${mode}`, unitId: unit.id, mode })),
);

export function unitById(unitId: string): Unit {
  const unit = UNITS.find((u) => u.id === unitId);
  if (!unit) throw new Error(`unknown unit: ${unitId}`);
  return unit;
}

export function stageById(stageId: string): Stage {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  return stage;
}

export function unitsOfGrade(grade: 1 | 2 | 3): Unit[] {
  return UNITS.filter((u) => u.grade === grade);
}
