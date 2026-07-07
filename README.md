# GrammarQuest（GrammerGamer）

中学英語の文法をゲーム形式で楽しく学習できるWebアプリ。

## 遊び方

- **中1〜中3の3ワールド × 各8単元**（be動詞〜仮定法まで全24単元・720問）
- 各単元に3つのゲームモード
  - ⚔️ **クイズバトル** — 4択に正解して敵のHPを削る。まちがえると反撃される
  - 🧱 **並べ替えパズル** — 単語カードをタップして英文を完成させる
  - ⏱️ **タイムアタック** — 60秒以内に穴埋め問題を解く。残り時間はXPボーナス
- 正解でXP獲得（コンボでボーナス）→ レベルアップ
- 正答率で☆1〜☆3評価。単元をクリアすると次の単元が解放
- まちがえた問題は 💪 **にがて復習** に自動登録。正解すると消える
- 🏅 バッジ（実績）13種
- 進捗はブラウザの localStorage に保存（サーバー不要・個人プレイ専用）

## 開発

```bash
npm install
npm run dev    # 開発サーバー (http://localhost:5173)
npm test       # Vitest（エンジン・進捗・問題データの整合性テスト）
npm run build  # 本番ビルド
```

## 構成

- React 18 + TypeScript + Vite（外部UIライブラリなし）
- `src/data/questions/` — 学年別の問題データ（choice / order / fill）
- `src/game/` — 採点・XP・☆・バッジ・解放条件などのロジック
- `src/store/progressStore.tsx` — 進捗の状態管理と localStorage 永続化
- `src/screens/` — ホーム / ゲーム3種 / 復習 / リザルト / バッジ画面
