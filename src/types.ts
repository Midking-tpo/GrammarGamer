export type GameMode = 'battle' | 'puzzle' | 'timeattack';

export interface ChoiceQuestion {
  id: string;
  unitId: string;
  type: 'choice';
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface OrderQuestion {
  id: string;
  unitId: string;
  type: 'order';
  ja: string;
  answer: string[];
  explanation: string;
}

export interface FillQuestion {
  id: string;
  unitId: string;
  type: 'fill';
  sentence: string;
  ja: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export type Question = ChoiceQuestion | OrderQuestion | FillQuestion;

export type Grade = 1 | 2 | 3;

export interface Unit {
  id: string;
  grade: Grade;
  title: string;
  icon: string;
}

export interface Stage {
  id: string;
  unitId: string;
  mode: GameMode;
}

export type Stars = 0 | 1 | 2 | 3;

export interface StageRecord {
  stars: Stars;
  bestScore: number;
}

export interface Progress {
  version: 1;
  xp: number;
  stages: Record<string, StageRecord>;
  badges: string[];
  wrongQuestionIds: string[];
  totalCorrect: number;
  bestCombo: number;
}

/** 1プレイの結果（リザルト画面・バッジ判定に渡す） */
export interface SessionResult {
  stageId: string | null; // null = にがて復習
  mode: GameMode | 'review';
  unitTitle: string;
  total: number;
  correct: number;
  maxCombo: number;
  earnedXp: number;
  stars: Stars;
  defeated: boolean; // バトルでHPが尽きた
  timeLeft: number; // タイムアタックの残り秒
  wrongQuestions: Question[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
}
