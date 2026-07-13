import type { EquipmentDef, Rarity } from '../types';

/** そうびマスタ（docs/item_memo.md を正式化したもの） */
export const EQUIPMENT: EquipmentDef[] = [
  // ===== ノーマル =====
  {
    id: 'n-sword',
    name: 'ふつうのけん',
    rarity: 'normal',
    price: 20,
    icon: '🗡️',
    description: '与えるダメージが10%増加する',
  },
  {
    id: 'n-shield',
    name: 'ふつうのたて',
    rarity: 'normal',
    price: 15,
    icon: '🛡️',
    description: '受けるダメージが5%減少する',
  },
  {
    id: 'n-cloak',
    name: 'きまぐれマント',
    rarity: 'normal',
    price: 50,
    icon: '🧣',
    description: 'ダメージを受けたとき10%の確率でそのダメージを0にする',
  },
  {
    id: 'n-coin',
    name: 'いかさまコイン',
    rarity: 'normal',
    price: 100,
    icon: '🪙',
    description: '各戦闘中最初にミスをしたとき、ダメージを受けずコンボも途切れない',
  },
  {
    id: 'n-stick',
    name: 'ゆっくりステッキ',
    rarity: 'normal',
    price: 100,
    icon: '🪄',
    description: '相手の攻撃までのカウントが1多くなる',
  },
  {
    id: 'n-candy',
    name: 'しかえしわたがし',
    rarity: 'normal',
    price: 100,
    icon: '🍬',
    description: 'ダメージを受けた時、その25%のダメージを相手に与える',
  },
  {
    id: 'n-charm',
    name: 'とっきゅうじゅぶつ',
    rarity: 'normal',
    price: 10,
    icon: '🧿',
    description:
      '相手に与えるすべてのダメージは相手の体力の100%になる。戦闘勝利時、50%の確率で自分は敗北する',
  },
  // ===== レア =====
  {
    id: 'r-leftover',
    name: 'たべのこし',
    rarity: 'rare',
    price: 100,
    icon: '🍕',
    description: '回答するたびに体力を最大体力の6.25%分回復する',
  },
  {
    id: 'r-poop',
    name: 'ふいうちうんち',
    rarity: 'rare',
    price: 50,
    icon: '💩',
    description: '各戦闘中、最初の攻撃で与えるダメージは2倍になる',
  },
  {
    id: 'r-pistol',
    name: 'はやうちピストル',
    rarity: 'rare',
    price: 150,
    icon: '🔫',
    description: '2秒以内に正解した場合、その攻撃を2回行う',
  },
  {
    id: 'r-tuna',
    name: 'れいとうマグロ',
    rarity: 'rare',
    price: 100,
    icon: '🐟',
    description: '各戦闘中、相手の最初の攻撃までのカウントは10増える',
  },
  {
    id: 'r-autoshield',
    name: '全自動シールド',
    rarity: 'rare',
    price: 300,
    icon: '🤖',
    description: '受けるすべてのダメージが50%になる',
  },
  {
    id: 'r-armor',
    name: 'がっちりアーマー',
    rarity: 'rare',
    price: 300,
    icon: '🦾',
    description: '自分の最大HPの5%以下のすべてのダメージを0にする',
  },
  // ===== スーパーレア =====
  {
    id: 's-iburi',
    name: 'フルボッコいぶりがっこ',
    rarity: 'super',
    price: 300,
    icon: '🥒',
    description: '一度もミスをせずに戦闘に勝利したとき、次の戦闘で与えるすべてのダメージが2倍になる',
  },
  {
    id: 's-radish',
    name: '5コンボダイコン',
    rarity: 'super',
    price: 350,
    icon: '🥕',
    description: '各戦闘中、初めて5コンボを達成した場合、相手の最大HPの50%のダメージを与える',
  },
  {
    id: 's-drone',
    name: 'レーザードローン',
    rarity: 'super',
    price: 250,
    icon: '🛸',
    description: '自分が攻撃した時、攻撃力の50%のダメージを今のコンボ回数分追加で与える',
  },
  {
    id: 's-nautilus',
    name: 'かいりきオウムガイ',
    rarity: 'super',
    price: 200,
    icon: '🐚',
    description: '10コンボ以上コンボしている時、与えるすべてのダメージは20倍になる',
  },
  // ===== レジェンド =====
  {
    id: 'l-water',
    name: 'ノーミスの水',
    rarity: 'legend',
    price: 500,
    icon: '💧',
    description: 'ミスをしていない間、受けるすべてのダメージが10になる。ミスをすると消えてしまう',
  },
];

export const RARITY_LABELS: Record<Rarity, string> = {
  normal: 'ノーマル',
  rare: 'レア',
  super: 'スーパーレア',
  legend: 'レジェンド',
};

/** 抽選確率（%） */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  normal: 50,
  rare: 30,
  super: 15,
  legend: 5,
};

export function equipmentById(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}
