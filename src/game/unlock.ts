import { MODES, unitsOfGrade } from '../data/curriculum';
import type { Progress, Unit } from '../types';

/** 単元クリア = その単元のいずれかのステージを☆1以上でクリア */
export function unitCleared(progress: Progress, unitId: string): boolean {
  return MODES.some((mode) => (progress.stages[`${unitId}-${mode}`]?.stars ?? 0) >= 1);
}

/** 各学年の最初の単元は常に解放。以降は同学年の前の単元をクリアで解放 */
export function isUnitUnlocked(progress: Progress, unit: Unit): boolean {
  const units = unitsOfGrade(unit.grade);
  const index = units.findIndex((u) => u.id === unit.id);
  if (index <= 0) return true;
  return unitCleared(progress, units[index - 1].id);
}
