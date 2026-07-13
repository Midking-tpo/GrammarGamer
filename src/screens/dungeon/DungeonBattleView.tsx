import { useEffect, useMemo, useRef, useState } from 'react';
import { Feedback } from '../../components/Feedback';
import { HpBar } from '../../components/bars';
import { QuestionPanel } from '../../components/QuestionPanel';
import { equipmentById } from '../../data/equipment';
import { dungeonQuestionPool } from '../../data/questions';
import {
  computeAttack,
  computeIncoming,
  enemyStats,
  goldReward,
  initialCount,
  jubutsuBackfire,
  leftoverHeal,
} from '../../game/dungeon';
import { shuffle } from '../../game/engine';
import { playClear, playCorrect, playLose, playWrong } from '../../game/sounds';
import type { DungeonRun, Question } from '../../types';

const DUNGEON_MONSTERS = ['👹', '🐲', '💀', '🧛', '🐉', '👺', '🦑', '🧟', '😈', '🌑'];

export interface BattleOutcome {
  won: boolean;
  goldGained: number;
  noMiss: boolean;
  jubutsuDeath: boolean;
  playerHp: number;
  combo: number;
  maxComboInBattle: number;
  equipment: string[]; // ノーミスの水の消滅を反映した最終状態
  correctCount: number;
  wrongIds: string[];
}

interface Props {
  run: DungeonRun;
  onOutcome: (outcome: BattleOutcome) => void;
  onQuit: () => void;
}

interface EventLine {
  id: number;
  text: string;
}

export function DungeonBattleView({ run, onOutcome, onQuit }: Props) {
  const enemy = useMemo(() => enemyStats(run.floor), [run.floor]);
  const monster = DUNGEON_MONSTERS[(run.floor - 1) % DUNGEON_MONSTERS.length];

  const [queue, setQueue] = useState<Question[]>(() => shuffle(dungeonQuestionPool()));
  const [qIndex, setQIndex] = useState(0);
  const [equipment, setEquipment] = useState<string[]>(run.equipment);
  const [enemyHp, setEnemyHp] = useState(enemy.hp);
  const [playerHp, setPlayerHp] = useState(run.hp);
  const [combo, setCombo] = useState(run.combo);
  const [maxCombo, setMaxCombo] = useState(0);
  const [count, setCount] = useState(() => initialCount(run.equipment, true));
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [shake, setShake] = useState<'enemy' | 'player' | null>(null);
  const [events, setEvents] = useState<EventLine[]>([]);
  const [lastDamage, setLastDamage] = useState<number | null>(null);

  // 戦闘中フラグ類
  const flags = useRef({
    firstAttackDone: false,
    firstCountDone: false,
    coinUsed: false,
    noMiss: true,
    radishUsed: false,
    over: false,
  });
  const stats = useRef({ correctCount: 0, wrongIds: [] as string[] });
  const shownAt = useRef(Date.now());
  const eventId = useRef(0);

  const current = queue[qIndex];

  function pushEvent(text: string) {
    eventId.current += 1;
    const id = eventId.current;
    setEvents((prev) => [...prev.slice(-2), { id, text }]);
  }

  // 敵カウント: 1秒ごとに減少（フィードバック表示中・戦闘終了後は停止）
  const running = feedback === null && !flags.current.over;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // カウント0 → 敵の攻撃
  useEffect(() => {
    if (count > 0 || !running) return;
    const incoming = computeIncoming({
      enemyAtk: enemy.atk,
      cause: 'count',
      equipment,
      noMissSoFar: flags.current.noMiss,
      coinUsedThisBattle: flags.current.coinUsed,
      maxHp: run.maxHp,
    });
    flags.current.firstCountDone = true;
    setShake('player');
    playWrong();
    pushEvent(`⏰ 敵の攻撃！ ${incoming.damage} ダメージ`);
    const nextHp = playerHp - incoming.damage;
    setPlayerHp(nextHp);
    if (incoming.reflect > 0) {
      pushEvent(`🍬 しかえし！ 敵に ${incoming.reflect}`);
      const nextEnemy = enemyHp - incoming.reflect;
      setEnemyHp(nextEnemy);
      if (nextEnemy <= 0 && nextHp > 0) return finishWin();
    }
    if (nextHp <= 0) return finishLose();
    setCount(initialCount(equipment, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, running]);

  function finishWin() {
    if (flags.current.over) return;
    flags.current.over = true;
    playClear();
    const gold = goldReward(run.floor);
    const jubutsuDeath = jubutsuBackfire(equipment);
    if (jubutsuDeath) playLose();
    onOutcome({
      won: true,
      goldGained: gold,
      noMiss: flags.current.noMiss,
      jubutsuDeath,
      playerHp: Math.max(0, playerHp),
      combo,
      maxComboInBattle: maxCombo,
      equipment,
      correctCount: stats.current.correctCount,
      wrongIds: stats.current.wrongIds,
    });
  }

  function finishLose() {
    if (flags.current.over) return;
    flags.current.over = true;
    playLose();
    onOutcome({
      won: false,
      goldGained: 0,
      noMiss: false,
      jubutsuDeath: false,
      playerHp: 0,
      combo: 0,
      maxComboInBattle: maxCombo,
      equipment,
      correctCount: stats.current.correctCount,
      wrongIds: stats.current.wrongIds,
    });
  }

  function handleAnswer(isCorrect: boolean) {
    if (!current || flags.current.over) return;
    const answerSec = (Date.now() - shownAt.current) / 1000;
    let hp = playerHp;
    let eHp = enemyHp;

    if (isCorrect) {
      const newCombo = combo + 1;
      const attack = computeAttack({
        atk: run.atk,
        combo: newCombo,
        equipment,
        isFirstAttackOfBattle: !flags.current.firstAttackDone,
        iburiActive: run.nextBattleDoubleDamage,
        answerSec,
        enemyHp: eHp,
        enemyMaxHp: enemy.hp,
        radishUsedThisBattle: flags.current.radishUsed,
      });
      flags.current.firstAttackDone = true;
      if (attack.radishTriggered) {
        flags.current.radishUsed = true;
        pushEvent(`🥕 5コンボダイコン発動！ +${attack.radishBonus}`);
      }
      if (attack.jubutsuUsed) pushEvent('🧿 とっきゅうじゅぶつが敵をのみこんだ！');
      if (attack.hits.length > 1) pushEvent('🔫 はやうち！ 2回攻撃');
      eHp -= attack.total;
      setEnemyHp(eHp);
      setLastDamage(attack.total);
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));
      stats.current.correctCount += 1;
      setShake('enemy');
      playCorrect();
    } else {
      const incoming = computeIncoming({
        enemyAtk: enemy.atk,
        cause: 'miss',
        equipment,
        noMissSoFar: flags.current.noMiss,
        coinUsedThisBattle: flags.current.coinUsed,
        maxHp: run.maxHp,
      });
      stats.current.wrongIds.push(current.id);
      setLastDamage(null);
      if (incoming.coinUsed) {
        flags.current.coinUsed = true;
        pushEvent('🪙 いかさまコイン！ ミスをなかったことにした');
      } else {
        flags.current.noMiss = false;
        setCombo(0);
        hp -= incoming.damage;
        setPlayerHp(hp);
        pushEvent(`💥 ミス！ ${incoming.damage} ダメージ`);
        if (incoming.waterLost) {
          setEquipment((eq) => eq.filter((id) => id !== 'l-water'));
          pushEvent('💧 ノーミスの水がくだけちった…');
        }
        if (incoming.reflect > 0) {
          eHp -= incoming.reflect;
          setEnemyHp(eHp);
          pushEvent(`🍬 しかえし！ 敵に ${incoming.reflect}`);
        }
      }
      setShake('player');
      playWrong();
    }

    // たべのこし: 回答するたびに回復
    const heal = leftoverHeal(equipment, run.maxHp);
    if (heal > 0 && hp > 0) {
      hp = Math.min(run.maxHp, hp + heal);
      setPlayerHp(hp);
    }

    setFeedback(isCorrect);
  }

  function handleNext() {
    setFeedback(null);
    setShake(null);
    setLastDamage(null);
    if (enemyHp <= 0) return finishWin();
    if (playerHp <= 0) return finishLose();
    if (qIndex + 1 >= queue.length) {
      setQueue(shuffle(dungeonQuestionPool()));
      setQIndex(0);
    } else {
      setQIndex(qIndex + 1);
    }
    shownAt.current = Date.now();
  }

  if (!current) return null;

  const countMax = initialCount(equipment, !flags.current.firstCountDone);

  return (
    <div className="screen game-screen dungeon-screen">
      <header className="game-header">
        <button className="btn ghost small" onClick={onQuit}>
          ✕ ちゅうだん
        </button>
        <span className="game-title">🏰 地下{run.floor}階</span>
        <span className="gold-badge">💰 {run.gold}G</span>
      </header>

      <div className="battle-field dungeon-field">
        <div className={`fighter enemy ${shake === 'enemy' ? 'hit' : ''}`}>
          <span className="fighter-emoji dungeon-monster">{monster}</span>
          <HpBar label="てき" current={Math.max(0, enemyHp)} max={enemy.hp} color="red" />
          <div className="count-gauge">
            <span className="count-label">こうげきまで</span>
            <div className="count-pips">
              {Array.from({ length: countMax }, (_, i) => (
                <span key={i} className={`pip ${i < count ? 'on' : ''}`} />
              ))}
            </div>
            <span className="count-value">{Math.max(0, count)}</span>
          </div>
        </div>
        <div className={`fighter player ${shake === 'player' ? 'hit' : ''}`}>
          <span className="fighter-emoji">🧑‍🎓</span>
          <HpBar label="きみ" current={Math.max(0, playerHp)} max={run.maxHp} color="green" />
          <span className="player-stats">
            ⚔️{run.atk} {run.nextBattleDoubleDamage && '🥒×2'}
          </span>
        </div>
      </div>

      <div className="dungeon-statusline">
        {combo >= 2 && <span className="combo-banner">🔥 {combo} コンボ中！</span>}
        {lastDamage !== null && <span className="damage-popup">-{lastDamage}</span>}
        {equipment.length > 0 && (
          <span className="equipment-mini">
            {equipment.map((id) => (
              <span key={id} title={equipmentById(id)?.name}>
                {equipmentById(id)?.icon}
              </span>
            ))}
          </span>
        )}
      </div>

      {events.length > 0 && (
        <div className="event-log">
          {events.map((e) => (
            <p key={e.id}>{e.text}</p>
          ))}
        </div>
      )}

      <QuestionPanel
        key={current.id}
        question={current}
        answered={feedback !== null}
        onAnswer={handleAnswer}
      />

      {feedback !== null && (
        <Feedback
          question={current}
          isCorrect={feedback}
          onNext={handleNext}
          nextLabel={enemyHp <= 0 ? '🎉 とどめ！' : playerHp <= 0 ? 'けっか を見る' : 'つぎへ ▶'}
        />
      )}
    </div>
  );
}
