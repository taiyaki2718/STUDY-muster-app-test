# CLAUDE.md — GoalFlow: Holographic OS

> プロジェクトの永続コンテキスト。毎セッションの最初に参照する。
> （フェーズ1「既存アプリの徹底把握」の成果物。コードは未変更。）

## 1. これは何か

「GoalFlow: Holographic OS」── 目標管理 + 集中タイマー + フラッシュカードを
ホログラフィックUI（リキッド・グラスモーフィズム）でまとめた、**完全オフライン対応の
学習計画 PWA**。元リポジトリ名は `STUDY-muster-app-test`（勉強計画アプリ）。
開発者表記は「たいやき」、アプリ内バージョンは `v1.3.0`。

## 2. 技術スタック（コードから確認済み・推測なし）

- **ビルドなし／バンドラなし／パッケージマネージャなし。** `package.json` は存在しない。
- 単一ファイル `index.html`（約1,785行）に CSS（`<style>`）と JS（`<script type="module">`）を内包。
- **UI: Preact 10.19.2 + `preact/hooks` + `htm` 3.1.1**。`<script type="importmap">` 経由で
  **esm.sh の CDN から ESM 直読み込み**（初回オンライン時のみ取得、以降は SW がキャッシュ）。
- TypeScript なし。Lint/Formatter なし。純ロジックの回帰テストは `tests/*.test.mjs`（Nodeのみ）。
- **バックエンドなし・認証なし。** すべてクライアント完結。
- **AIは撤去（v1.3.0）**: 高度なAIが既に普及し差別化にならない判断で、AIコーチ(Claude API/BYOK/proxy)を
  全削除。目標分解はAI不要の決定論的スケジューラ `planGoal`（オートプラン）に一本化。
- **収益化＝フリーミアム（Pro: 月額/年額）**: 課金は外部サービス(Lemon Squeezy等)。購入時の
  **ライセンス鍵**をアプリで検証して Pro を解放（`validateLicense`/`interpretLicense`、`ProStore` は
  reducer 外の localStorage）。Pro機能はAIではない付加価値＝**プレミアムテーマ(アクセントカラー)** 等。
  無料版は全機能維持（North Star: ダークパターン禁止）。設定は `PRO`(購入URL/価格/検証URL)。手順は `MONETIZE.md`。
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

タブ（`TABS` / `VIEWS`）: 8画面（v1.3.0でAIコーチ撤去）
1. **home** (`Home`) — Goal Core。時計・なりたい自分・レベル/XP/ストリーク・今日のタスク・目標カード。
2. **calendar** (`Calendar`) — 月カレンダー + 月間目標 + サブタスク（回路に同期）+ 日次タスク（if-then きっかけ入力）。
3. **maps** (`CircuitMap`) — 「思考回路」= 目標のツリー(マインドマップ)を自動レイアウト描画。
4. **goals** (`Goals`) — 戦略目標（タイトル+期限、任意 metric）+ **オートプラン**（目標→カレンダー自動割当, `AutoPlanModal`）。
5. **timer** (`Timer`) — 水位アニメの集中タイマー + Zen 全画面 + 環境音。
6. **cards** (`Cards`) — フラッシュカード（SM-2 間隔反復、検索/カテゴリ/タグ）。
7. **insight** (`Insight`) — 解析（累計集中時間・XP・ストリーク・週次バー）。
8. **settings** (`Settings`) — プラン(Pro)・アクセントカラー(Pro)・identity・音量・JSON エクスポート/インポート・応援・バージョン。

共通: 右上テーマトグル（dark/light）、下部フローティングナビ、トースト。

## 5. データモデル（`seed()` と reducer から）

```
state = {
  settings: { theme:'dark'|'light', soundVolume:0..1, bgmPreset:'rain', accent?:'cyan'|'amber'|'violet'|'emerald'|'rose' },
  // Pro課金状態は reducer 外。localStorage `goalflow:pro` に { active, plan, key, checkedAt }（エクスポート非含有）
  goals:   [{ id, title, deadline, metric?:{done,target,unit?} }], // metric は Goals で設定/増減可
  tasks:   [{ id, title, date:'YYYY-MM-DD', done:bool, cue?:string }], // cue = if-then きっかけ
  monthGoals: { [YYYY-MM]: { title, subtasks:[{ id, title, taskId?|nodeId? }] } },
  maps:    [{ id:'map_YYYY-MM', title, rootId:'r', month,
             nodes:{ [id]:{ id, text, parentId?, children:[], taskId?, manualDone? } } }],
  cards:   [{ id, front, back, category, tags:[], ease, interval, reps, due:'YYYY-MM-DD' }],
  timer:   { lastDurationMin:25, sessions:[{ t:epochMs, min }] },
  activeTimerTarget: null | { type:'task'|'node', id, mapId?, title },
  xp: 0, level: 1, streak: 0, lastActiveDate: null,
  identity: '',          // なりたい自分（Atomic Habits）。Home に控えめ表示／Settings で編集
  onboarded: false       // 初回オンボーディング完了フラグ
}
```

reducer アクション: `TOGGLE_TASK / ADD_TASK / ADD_TASKS / DELETE_TASK / ADD_GOAL / UPDATE_GOAL /
DELETE_GOAL / SET_MONTH_GOAL / ADD_MONTH_SUBTASK / UPDATE_MAP / TOGGLE_MAP_NODE /
ADD_CARD / UPDATE_CARD / DELETE_CARD / REVIEW_CARD / LOG_SESSION /
SET_ACTIVE_TIMER_TARGET / SET_SETTINGS / SET_IDENTITY / COMPLETE_ONBOARDING / IMPORT`。
（`ADD_TASKS` はオートプランの一括追加。`planGoal` がタスク配列を生成して投入する。）

要点:
- **XP/レベル**: `LOG_SESSION` で `xp += min*10`、`level = floor(sqrt(xp/100))+1`。カード復習で `xp+=5`。
- **ストリーク**: `streak` を更新するアクションが**存在しない**（常に 1 のまま。下記「既知の不具合」）。
- **タスク↔ノード同期**: 月間サブタスクは task か map node のどちらかに紐づき、完了状態を共有。
- **間隔反復**: `REVIEW_CARD` が SM-2 を実装（grade 2/3/4/5 = もう一度/難しい/普通/簡単）。

## 6. 動かし方

- **ビルド不要。** 静的ファイルを配信するだけ。例: リポジトリ直下で
  `python3 -m http.server 8000` → `http://localhost:8000/index.html`。
  （SW・importmap・PWA を正しく動かすため file:// ではなく HTTP で開くこと。）
- **テスト**: 純ロジックの回帰テストを `tests/` に追加。`node tests/streak.test.mjs`
  と `node tests/insight.test.mjs` で実行（ランナー不要、Node のみ）。
  ※ 現状テストはアプリ本体のロジックを「ミラー」している（単一HTMLで export 不可のため）。
  将来、純ロジックを別モジュールへ抽出して二重管理を解消する。
- **ブラウザ実機確認**: この実行環境はネットワークポリシーにより Playwright の
  ブラウザDLと esm.sh への直アクセス(curl)がブロックされる。実画面のスクリーンショット
  確認はローカル/CIで `python3 -m http.server` + ブラウザで行うこと。
- **デプロイ**: 静的ホスティング（GitHub Pages 等）にファイルを置くだけ。
- 初回はオンラインで esm.sh から Preact/htm を取得（以降 SW がオフライン供給）。

## 7. 強み（理解せずに壊さないこと）

- 一貫した美しいホログラフィック・デザインシステム（dark/light 両対応、CSS変数で統一）。
- 堅実なオフラインファースト PWA（network-first ナビ + cache-first アセット + 音声 Range 対応）。
- 体感の良いタイマー（RAF + DOM 直接更新、React 再描画は毎秒1回に間引き＝カクつかない）。
- フラッシュカードの SM-2 間隔反復が正しく実装済み。
- データ主権（localStorage + JSON エクスポート/インポート、送信なし＝プライバシー良好）。
- 「思考回路」による目標分解の可視化は、世界一に向けた差別化の核になり得る。

## 8. 既知の不具合 / 負債

### ✅ フェーズ「基盤の安定化」で修正済み（commit 履歴参照）
- ~~ストリークが常に 1~~ → 活動駆動 + グレースデーの実ロジック（`bumpStreak`/`reconcileStreak`、
  テスト `tests/streak.test.mjs`）。
- ~~Insight の週次バーが `Math.random()`~~ → `timer.sessions` から直近7日の実集中時間を集計
  （テスト `tests/insight.test.mjs`）。
- ~~未定義アイコン `spark`/`clock`~~ → ICONS に追加。
- ~~`branch` アイコン SVG が不正~~ → 正しい git-branch SVG に修正。
- ~~`.line-bar-wrap/.line-bar-fill` 未定義~~ → CSS 追加で Goals の metric バーが表示。
- ~~走行中タイマーがタブ切替で消える~~ → モジュールレベル `timerKeep` で保持・復元
  （※ページ完全リロードでの復元は未対応。将来 state 永続化で対応）。

### ✅ フェーズ「行動変容の核 #1」で追加
- 初回オンボーディング（`Onboarding`、3ステップ・スキップ可）= identity / 目標 / 2分の
  最初の一歩 + if-then きっかけ。完了で目標1つ＋今日のタスク1つを生成（コールドスタート解消）。
- タスクの if-then きっかけ（`task.cue`）。Calendar 追加UI + Home/Calendar 一覧に表示。
- Home のアイデンティティ想起バナー、Settings で identity 編集。
- `shouldOnboard()` で既存ユーザーにはオンボーディングを出さない。
- テスト `tests/onboarding.test.mjs`（15件）。

### ✅ AIコーチ撤去 + フリーミアム(Pro 月額/年額)導入（v1.3.0・現行方針）
- **AIコーチ(Coachタブ/ClaudeAPI/ApiKeyStore/AI_PROXY_URL/ai-proxy/coach系テスト)を全削除**。
  理由: 高度なAIが既に普及し差別化にならない。目標分解は `planGoal`（オートプラン, AI不要）に一本化。
- **Pro(有料)**: `PRO`(monthlyUrl/annualUrl/価格/validateUrl), `ProStore`(localStorage), `isProActive`,
  `interpretLicense`(Lemon Squeezy応答判定), `validateLicense`(ブラウザ直検証), `effectiveAccent`。
  `UpgradeModal`(月額/年額カード+ライセンス鍵有効化)。起動時にベストエフォート再検証(無効確定時のみ解除)。
- **Pro機能#1 = プレミアムテーマ**: アクセントカラー5種(`ACCENTS`, `[data-accent=...]` CSS)。無料はcyan固定。
- 倫理: 無料版は全機能維持・ペイウォールは閉じられる・ダークパターン無し。`tests/pro.test.mjs`(13件)。
- ⚠️ 以下「差別化 — AIコーチ」〜「収益化＝寄付」の各節は**履歴**（v1.3.0で撤去/置換済み）。

### ✅ フェーズ「差別化 — AIコーチ」で追加（※v1.3.0で撤去）
- AIコーチ（`Coach` タブ）= Claude API(BYOK)。**目標分解**（具体化→マイルストーン→今週の行動
  →今日の2分の一歩+if-thenきっかけ、構造化出力）を既存のタスク/目標に1タップで反映。
  **対話コーチ**（つまずき診断・振り返り・壁打ち、状況の要約のみ送信）。
- Settings に APIキー管理（password入力・表示切替・削除、エクスポートに含めない）。
- `tests/coach.test.mjs`（9件、`buildCoachContext` の要約/プライバシー）。

### ✅ AIコーチの磨き込み
- 対話を **SSEストリーミング**化（`ClaudeAPI.callStream`/`chatStream`、`fetch` の ReadableStream を
  自前パース）。吹き出しが逐次埋まり、待機中はタイピングインジケータ表示。
  `tests/coach_stream.test.mjs`（7件、チャンク境界/不正JSON/エラーイベント）。
  ※ 目標分解は構造化出力のため非ストリーミングのまま（全文JSONが必要）。

### ✅ AIコーチの提供方法を拡張（v1.2.1）
- **任意のバックエンドproxy対応**: `AI_PROXY_URL` 定数にデプロイ先(例 Cloudflare Worker)を入れると、
  アプリ利用者は**APIキー入力なし**でAIコーチを使える（鍵はproxyのサーバー秘密で保持）。
  `ClaudeAPI.buildReq` が proxy 経由(鍵なし) or BYOK(各自の鍵で直接) を自動切替。
  `ClaudeAPI.available()/usingProxy()` で Coach のゲート判定。空なら従来どおりBYOK/キー不要オートプラン。
- proxy 実体は `ai-proxy/worker.js`（CORS制限・`max_tokens`上限）＋ `ai-proxy/README.md`（デプロイ手順）。
- 設計判断: コードに鍵直書きは公開リポで危険のため禁止。「利用者ゼロ設定」を満たすには
  オーナーが一度proxyをデプロイ（鍵はサーバー側）。利用料はオーナー負担、悪用対策を同梱。

### ✅ 収益化＝寄付/サポート方式（v1.2.2）
- 方針: **全機能無料のまま**、押し付けない「応援(寄付)」導線のみ（North Star: ダークパターン禁止）。
- `SUPPORT`（Ko-fi/BMC/GitHub Sponsors/PayPal のURL）を入れると、Settings に「応援する」ボタンが出る
  （未設定の項目は非表示＝壊れない）。`.github/FUNDING.yml` で GitHub の Sponsor ボタンも対応。
- `supportLinks()` が設定済みリンクだけを返す。手順は `MONETIZE.md`。
- 注意: 寄付は機能をゲートしない。AIコーチは実費が出るため、寄付方式では **BYOK 維持を推奨**
  （proxyで全員無料配布するとオーナー負担）。将来フリーミアム化する場合は Worker でライセンス検証。

### ✅ フェーズ「オートプラン — キー不要の自動カレンダー割り当て」で追加（v1.2.0）
- **APIキー不要**の決定論的スケジューラ `planGoal`/`planTaskDates`：目標＋期限＋頻度
  （毎日/平日/週3/週1）＋任意の「1回の内容」から、今日〜期限のタスクを**カレンダーへ自動配置**。
  最初は今日の「2分の一歩」＋if-thenきっかけ、最後は総仕上げ。`tests/autoplan.test.mjs`（12件）。
- `AutoPlanModal`（プレビュー件数表示）。Goals の最上部に「目標からカレンダーに自動で割り振る」、
  各目標カードに「カレンダーに割り振る」、Coach のキー未設定画面でも先頭に提示（**キー入力を強制しない**）。
- 反復追加用の reducer `ADD_TASKS`。
- AIコーチ（BYOK）の目標分解結果からも「カレンダーに自動で割り振る」へ接続（任意）。
- 設計判断: バックエンド無し・静的の制約上、キーを隠す方法が無いため、**中核の自動計画は
  ローカルで完結**させ、Claude API は「より賢い分解／対話」の任意拡張に留めた。

### ✅ フェーズ「拡張 — 品質/アクセシビリティ」で追加（v1.1.0）
- アクセシビリティ: フローティングナビを `<button>`＋`aria-label`＋`aria-current` 化、
  タスクのチェックを `role`付きボタン(`aria-pressed`)化、主要アイコンボタンに `aria-label`、
  目標バーに `role="progressbar"`、`:focus-visible` のキーボードフォーカス可視化、
  `prefers-reduced-motion` で装飾アニメ停止、トーストに `aria-live`。
- ネイティブ `confirm()/alert()` を**アプリ内モーダル** `ConfirmDialog`（`Ctx` の `confirm()` が
  `Promise<boolean>` を返す）に置換。Escape/背景クリックでキャンセル、`role="alertdialog"`。
- **Goals の metric 設定UI を追加**（作りかけ機能の完成）: 目標値・単位・現在値の入力、
  カードでの進捗バー表示と ±ボタンでの増減（clamp）。`tests/goals_metric.test.mjs`（10件）。

### 残課題（次の候補・未着手）
- 用途別モデル使い分け（軽い励まし=高速モデル）は未実装（現状すべて `claude-opus-4-8`）。
  ※claude-api スキルの指針「コスト目的の格下げはしない」に従い意図的に opus 既定のまま。
- if-then きっかけは現状 task のみ（月間サブタスク/回路ノードには未対応）。
- 通知・リマインダー無し（if-then の「きっかけ時刻」を活かす余地）。
- i18n 無し（日本語・`Asia/Tokyo` ハードコード）。文言の外部化は未着手。

体験/行動科学（世界一の核・未着手）:
- AI 機能ゼロ（コーチング・目標分解・具体化・つまずき診断なし）。
- 実行意図（if-then）、習慣スタッキング、2分ルール、振り返り/ジャーナル、通知 ── いずれも無し。
- **オンボーディング無し**＝初回は全画面が空。最初の一歩までの摩擦が最大。
- 次の推奨: 実行意図(if-then) + 2分ルールの最初の一歩オンボーディング（Top1/Top2 を同時攻略）。

品質/横断:
- Lint・型・ビルド無し。純ロジックのみ `tests/*.test.mjs`（Nodeのみ）。全コードが単一 HTML。
- アクセシビリティ: v1.1.0 で大幅改善（ナビ/チェック/アイコンボタンの aria、focus-visible、
  reduced-motion、progressbar、aria-live）。色のみ依存の状態表現や完全な SR 検証は今後も継続課題。
- ネイティブ `confirm()/alert()` 依存は解消（`ConfirmDialog`）。
- i18n 無し（日本語・`Asia/Tokyo` ハードコード）。文言外部化は未着手。
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
