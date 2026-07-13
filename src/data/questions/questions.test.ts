import { describe, expect, it } from 'vitest';
import { MODES, STAGES, SUMMARY_STAGES, UNITS, unitsOfGrade } from '../curriculum';
import { QUESTIONS_PER_STAGE } from '../../game/engine';
import {
  ALL_QUESTIONS,
  dungeonQuestionPool,
  questionsForStage,
  questionsForSummary,
} from './index';
import type { Grade } from '../../types';

describe('問題データの整合性', () => {
  it('idが重複していない', () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('すべての問題が存在する単元に属している', () => {
    const unitIds = new Set(UNITS.map((u) => u.id));
    for (const q of ALL_QUESTIONS) {
      expect(unitIds.has(q.unitId), `unknown unit: ${q.unitId} (${q.id})`).toBe(true);
    }
  });

  it('全ステージに10問以上の問題プールがある', () => {
    for (const stage of STAGES) {
      const pool = questionsForStage(stage.unitId, stage.mode);
      expect(
        pool.length,
        `${stage.id} の問題が ${pool.length} 問しかない`,
      ).toBeGreaterThanOrEqual(QUESTIONS_PER_STAGE);
    }
  });

  it('choice/fill問題のanswerが選択肢の範囲内', () => {
    for (const q of ALL_QUESTIONS) {
      if (q.type === 'choice' || q.type === 'fill') {
        expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
        expect(q.answer, q.id).toBeLessThan(q.choices.length);
        expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2);
        const unique = new Set(q.choices);
        expect(unique.size, `${q.id} に重複した選択肢がある`).toBe(q.choices.length);
      }
    }
  });

  it('fill問題の英文に空欄(___)がある', () => {
    for (const q of ALL_QUESTIONS) {
      if (q.type === 'fill') {
        expect(q.sentence.includes('___'), `${q.id} に ___ がない`).toBe(true);
      }
    }
  });

  it('order問題は2語以上で、解説と日本語訳がある', () => {
    for (const q of ALL_QUESTIONS) {
      if (q.type === 'order') {
        expect(q.answer.length, q.id).toBeGreaterThanOrEqual(2);
        expect(q.ja.length, q.id).toBeGreaterThan(0);
      }
      expect(q.explanation.length, `${q.id} に解説がない`).toBeGreaterThan(0);
    }
  });

  it('単元数とステージ数が仕様どおり（24単元×3モード）', () => {
    expect(UNITS).toHaveLength(24);
    expect(MODES).toHaveLength(3);
    expect(STAGES).toHaveLength(72);
  });

  it('まとめステージは学年の全単元・全タイプを含む', () => {
    expect(SUMMARY_STAGES).toHaveLength(3);
    for (const grade of [1, 2, 3] as Grade[]) {
      const pool = questionsForSummary(grade);
      const units = unitsOfGrade(grade);
      expect(pool).toHaveLength(units.length * 30); // 8単元×30問
      const unitIds = new Set(pool.map((q) => q.unitId));
      expect(unitIds.size).toBe(units.length);
      const types = new Set(pool.map((q) => q.type));
      expect(types).toEqual(new Set(['choice', 'order', 'fill']));
    }
  });

  it('ダンジョンの出題プールは全単元の4択問題', () => {
    const pool = dungeonQuestionPool();
    expect(pool).toHaveLength(UNITS.length * 10); // 24単元×10問
    expect(pool.every((q) => q.type === 'choice')).toBe(true);
    expect(new Set(pool.map((q) => q.unitId)).size).toBe(UNITS.length);
  });
});
