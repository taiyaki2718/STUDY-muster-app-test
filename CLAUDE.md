# CLAUDE.md — GoalFlow: Holographic OS

> プロジェクトの永続コンテキスト。毎セッションの最初に参照する。
> （フェーズ1「既存アプリの徹底把握」の成果物。コードは未変更。）

## 1. これは何か

「GoalFlow: Holographic OS」── 目標管理 + 集中タイマー + フラッシュカードを
ホログラフィックUI（リキッド・グラスモーフィズム）でまとめた、**完全オフライン対応の
学習計画 PWA**。元リポジトリ名は `STUDY-muster-app-test`（勉強計画アプリ）。
開発者表記は「たいやき」、アプリ内バージョンは `v1.0.6`。

## 2. 技術スタック（コードから確認済み・推測なし）

- **ビルドなし／バンドラなし／パッケージマネージャなし。** `package.json` は存在しない。
- 単一ファイル `index.html`（約1,785行）に CSS（`<style>`）と JS（`<script type="module">`）を内包。
- **UI: Preact 10.19.2 + `preact/hooks` + `htm` 3.1.1**。`<script type="importmap">` 経由で
  **esm.sh の CDN から ESM 直読み込み**（初回オンライン時のみ取得、以降は SW がキャッシュ）。
- TypeScript なし。Lint/Formatter なし。**テスト一切なし。**
- **バックエンドなし・認証なし。** すべてクライアント完結。
- **状態管理**: `useReducer` + 単一 `reducer`。`localStorage`（キー `goalflow:v22:holo`）に
  500ms デバウンスで永続化。起動時に復元。
- **PWA**: `manifest.webmanifest`（installable, standalone, portrait, theme `#060B14`）+
  `sw.js`（Service Worker）。
- **Service Worker (`sw.js`, cache `goalflow-cache-v11`)**:
  - ナビゲーション(HTML)は **network-first**（デプロイ更新が即反映）。
  - その他アセットは **cache-first**。
  - `<audio>` の **Range リクエストに 206 Partial Content を自作対応**（iOS/Safari でオフライン再生可）。
  - precache に app shell・アイコン・4つの mp3・esm.sh の3エントリを含む（約16MB）。
- **音声**: BGM は HTML5 `<audio id="bgm-player">`（4トラック同梱 mp3）。完了音は WebAudio の
  オシレータ（`AudioEngine.chime()`）。`AudioEngine` は IIFE シングルトン。
- **対象プラットフォーム**: モバイル中心の Web/PWA。iOS 寄り
  （safe-area, `apple-mobile-web-app-*`, タイムゾーン **`Asia/Tokyo` ハードコード**）。

## 3. ディレクトリ構成

```
/index.html            ← アプリ全体（CSS+JS インライン）
/sw.js                 ← Service Worker（オフライン/キャッシュ/音声Range）
/manifest.webmanifest  ← PWA マニフェスト
/icons/                ← 192/512/180 + maskable PNG
/*.mp3                 ← 環境音 BGM 4トラック（合計 ~16MB）
/README.md
/CLAUDE.md             ← 本ファイル
```

## 4. アーキテクチャ / 画面

`Ctx`（Preact Context）が `{ state, dispatch, addToast }` を供給。`App` が
`useReducer` を保持し、タブで View を切替（フルページ遷移、ルータなし）。

タブ（`TABS` / `VIEWS`）: 8画面
1. **home** (`Home`) — Goal Core。時計・レベル/XP/ストリーク・今日のタスク・目標カード。
2. **calendar** (`Calendar`) — 月カレンダー + 月間目標 + サブタスク（回路に同期）+ 日次タスク。
3. **maps** (`CircuitMap`) — 「思考回路」= 目標のツリー(マインドマップ)を自動レイアウト描画。
4. **goals** (`Goals`) — 戦略目標（タイトル+期限、任意 metric）。
5. **timer** (`Timer`) — 水位アニメの集中タイマー + Zen 全画面 + 環境音。
6. **cards** (`Cards`) — フラッシュカード（SM-2 間隔反復、検索/カテゴリ/タグ）。
7. **insight** (`Insight`) — 解析（累計集中時間・XP・ストリーク・週次バー）。
8. **settings** (`Settings`) — 音量・JSON エクスポート/インポート・バージョン。

共通: 右上テーマトグル（dark/light）、下部フローティングナビ、トースト。

## 5. データモデル（`seed()` と reducer から）

```
state = {
  settings: { theme:'dark'|'light', soundVolume:0..1, bgmPreset:'rain' },
  goals:   [{ id, title, deadline, metric?:{done,target} }],
  tasks:   [{ id, title, date:'YYYY-MM-DD', done:bool }],
  monthGoals: { [YYYY-MM]: { title, subtasks:[{ id, title, taskId?|nodeId? }] } },
  maps:    [{ id:'map_YYYY-MM', title, rootId:'r', month,
             nodes:{ [id]:{ id, text, parentId?, children:[], taskId?, manualDone? } } }],
  cards:   [{ id, front, back, category, tags:[], ease, interval, reps, due:'YYYY-MM-DD' }],
  timer:   { lastDurationMin:25, sessions:[{ t:epochMs, min }] },
  activeTimerTarget: null | { type:'task'|'node', id, mapId?, title },
  xp: 0, level: 1, streak: 1
}
```

reducer アクション: `TOGGLE_TASK / ADD_TASK / DELETE_TASK / ADD_GOAL / UPDATE_GOAL /
DELETE_GOAL / SET_MONTH_GOAL / ADD_MONTH_SUBTASK / UPDATE_MAP / TOGGLE_MAP_NODE /
ADD_CARD / UPDATE_CARD / DELETE_CARD / REVIEW_CARD / LOG_SESSION /
SET_ACTIVE_TIMER_TARGET / SET_SETTINGS / IMPORT`。

要点:
- **XP/レベル**: `LOG_SESSION` で `xp += min*10`、`level = floor(sqrt(xp/100))+1`。カード復習で `xp+=5`。
- **ストリーク**: `streak` を更新するアクションが**存在しない**（常に 1 のまま。下記「既知の不具合」）。
- **タスク↔ノード同期**: 月間サブタスクは task か map node のどちらかに紐づき、完了状態を共有。
- **間隔反復**: `REVIEW_CARD` が SM-2 を実装（grade 2/3/4/5 = もう一度/難しい/普通/簡単）。

## 6. 動かし方

- **ビルド不要。** 静的ファイルを配信するだけ。例: リポジトリ直下で
  `python3 -m http.server 8000` → `http://localhost:8000/index.html`。
  （SW・importmap・PWA を正しく動かすため file:// ではなく HTTP で開くこと。）
- **テスト**: 現状なし（テストランナー未導入）。
- **デプロイ**: 静的ホスティング（GitHub Pages 等）にファイルを置くだけ。
- 初回はオンラインで esm.sh から Preact/htm を取得（以降 SW がオフライン供給）。

## 7. 強み（理解せずに壊さないこと）

- 一貫した美しいホログラフィック・デザインシステム（dark/light 両対応、CSS変数で統一）。
- 堅実なオフラインファースト PWA（network-first ナビ + cache-first アセット + 音声 Range 対応）。
- 体感の良いタイマー（RAF + DOM 直接更新、React 再描画は毎秒1回に間引き＝カクつかない）。
- フラッシュカードの SM-2 間隔反復が正しく実装済み。
- データ主権（localStorage + JSON エクスポート/インポート、送信なし＝プライバシー良好）。
- 「思考回路」による目標分解の可視化は、世界一に向けた差別化の核になり得る。

## 8. 既知の不具合 / 負債（フェーズ1で発見・未修正）

信頼を損なう/壊れている:
- **ストリークが常に 1**。インクリメントするロジックが無い（home/insight で「連続達成日数」が偽値）。
- **Insight の週次バーが `Math.random()`** ＝ 実データではなくランダムなダミー。
- 未定義アイコンが silent fallback: `Home` の `n="spark"`、`Timer` の `n="clock"` は
  `ICONS` に無く、既定の `core` が描画される。
- `branch` アイコンの SVG が壊れている（`<path d="M6" y1=... />` は不正）。
- `Goals` の metric バーが使う CSS クラス `.line-bar-wrap/.line-bar-fill` が**未定義**＝表示されない。
- **走行中タイマーがタブ切替で消える**（`Timer` がアンマウントされ、ローカル state の
  running/残り時間が失われる。永続化なし）。

体験/行動科学（世界一の核）の不足:
- AI 機能ゼロ（コーチング・目標分解・具体化・つまずき診断なし）。
- 実行意図（if-then）、習慣スタッキング、2分ルール、振り返り/ジャーナル、通知 ── いずれも無し。
- **オンボーディング無し**＝初回は全画面が空。最初の一歩までの摩擦が最大。

品質/横断:
- テスト・Lint・型・ビルド無し。全コードが単一 1,785 行ファイル。
- アクセシビリティ未対応（アイコンのみのナビに aria/label 無し、色のみで状態表現、`<div>` クリック）。
- i18n 無し（日本語・`Asia/Tokyo` ハードコード）。`confirm()/alert()` ネイティブダイアログ依存。
- Preact を CDN 依存（SW でキャッシュされるが初回はネット必須）。

## 9. North Star（判断基準）

「世界一」= 見た目や機能数ではなく、**ユーザーが実際に目標を達成できること**
（行動が変わり、続き、前に進む）。派手さより「明日も開きたい」「今日の一歩を踏み出せる」を優先。
ダークパターン・通知スパム・罪悪感ビジネスは禁止。ローカル保持/プライバシー優先。

## 10. 進め方の規約

- 調査 → 計画 → 合意 → 実装 → 検証 のループ。大きな実装は事前に計画を提示し合意を取る。
- フェーズ単位で進め、各フェーズ末に「何を変えたか／なぜ効くか／次の提案」を報告。
- 各変更後はビルド(静的確認)・動作確認をセットで。意味のある単位で小刻みにコミット。
- 全面書き換え・破壊的変更は事前合意。良い既存設計を理解せず壊さない。
- 作業ブランチ: `claude/new-session-27ceqj`。
</content>
</invoke>
