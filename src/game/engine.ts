import type { OrderQuestion, Question, Stars } from '../types';

/** バトル: 敵を倒すのに必要な正解数 */
export const ENEMY_HP = 7;
/** バトル: プレイヤーのHP（この回数まちがえたら敗北） */
export const PLAYER_HP = 4;
/** タイムアタックの制限時間（秒） */
export const TIME_LIMIT = 60;
/** 1ステージの出題数 */
export const QUESTIONS_PER_STAGE = 10;

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 選択肢をシャッフルし、新しい正解indexを返す */
export function shuffleChoices(
  choices: string[],
  answer: number,
): { choices: string[]; answer: number } {
  const correct = choices[answer];
  const shuffled = shuffle(choices);
  return { choices: shuffled, answer: shuffled.indexOf(correct) };
}

/** 並べ替え問題の単語カード（同じ語順にならないようシャッフル） */
export function shuffledWords(q: OrderQuestion): string[] {
  if (q.answer.length < 2) return [...q.answer];
  for (let i = 0; i < 10; i++) {
    const words = shuffle(q.answer);
    if (words.join(' ') !== q.answer.join(' ')) return words;
  }
  return [...q.answer].reverse();
}

/** 並べ替えの答え合わせ */
export function checkOrder(placed: string[], answer: string[]): boolean {
  return (
    placed.length === answer.length &&
    placed.every((w, i) => w === answer[i])
  );
}

/** 正解1問あたりのXP。コンボ（連続正解数）でボーナスが増える */
export function xpForCorrect(combo: number): number {
  const bonus = Math.min(Math.max(combo - 1, 0), 5) * 2;
  return 10 + bonus;
}

/** タイムアタッククリア時の残り時間ボーナスXP */
export function timeBonusXp(timeLeft: number): number {
  return Math.max(0, Math.round(timeLeft));
}

/** 正答率から☆評価を計算。defeated=バトル敗北時は☆0 */
export function starsFor(correct: number, total: number, defeated = false): Stars {
  if (defeated || total === 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

/** レベル n → n+1 に必要なXP */
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

/** 累計XPからレベルを計算 */
export function levelForXp(xp: number): number {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return level;
}

/** 現在レベル内でのXP進捗（レベルバー表示用） */
export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return { level, current: rest, needed: xpToNextLevel(level) };
}

/** ステージ用に問題を選んでシャッフルする */
export function pickQuestions(pool: Question[], count = QUESTIONS_PER_STAGE): Question[] {
  return shuffle(pool).slice(0, count);
}
