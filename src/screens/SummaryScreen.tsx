import { useMemo } from 'react';
import { summaryStageOf } from '../data/curriculum';
import { questionsForSummary } from '../data/questions';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Grade } from '../types';
import { BattleCore, type BattleConfig } from './battleCore';

interface Props {
  grade: Grade;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

/** ワールドまとめステージ: 学年の全単元・全タイプ混合のボス戦 */
export function SummaryScreen({ grade, onFinish, onQuit }: Props) {
  const stage = summaryStageOf(grade);
  const config: BattleConfig = useMemo(
    () => ({
      headerTitle: `👑 ${stage.title}`,
      unitTitle: `${stage.title}（ワールドボス）`,
      monster: stage.boss,
      stageId: stage.id,
      mode: 'summary',
      pool: questionsForSummary(grade),
      questionCount: stage.questionCount,
      enemyHp: stage.bossHp,
      playerHp: stage.playerHp,
      winBonusXp: stage.winBonusXp,
    }),
    [grade, stage],
  );
  return <BattleCore config={config} onFinish={onFinish} onQuit={onQuit} />;
}
