import { useMemo } from 'react';
import { unitById } from '../data/curriculum';
import { questionsForStage } from '../data/questions';
import { ENEMY_HP, PLAYER_HP, QUESTIONS_PER_STAGE } from '../game/engine';
import type { CompleteSessionPayload } from '../store/progressStore';
import type { Stage } from '../types';
import { BattleCore, type BattleConfig } from './battleCore';

const MONSTERS = ['👾', '🐙', '🦖', '🐉', '👹', '🧟', '🦂', '🐍', '🧌', '🦇', '🤖', '🐗'];

function monsterFor(unitId: string): string {
  let hash = 0;
  for (const ch of unitId) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return MONSTERS[hash % MONSTERS.length];
}

interface Props {
  stage: Stage;
  onFinish: (payload: CompleteSessionPayload) => void;
  onQuit: () => void;
}

export function BattleScreen({ stage, onFinish, onQuit }: Props) {
  const unit = unitById(stage.unitId);
  const config: BattleConfig = useMemo(
    () => ({
      headerTitle: `⚔️ ${unit.title}`,
      unitTitle: unit.title,
      monster: monsterFor(unit.id),
      stageId: stage.id,
      mode: 'battle',
      pool: questionsForStage(unit.id, 'battle'),
      questionCount: QUESTIONS_PER_STAGE,
      enemyHp: ENEMY_HP,
      playerHp: PLAYER_HP,
      winBonusXp: 20,
    }),
    [stage.id, unit],
  );
  return <BattleCore config={config} onFinish={onFinish} onQuit={onQuit} />;
}
