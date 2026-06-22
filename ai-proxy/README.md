# AIコーチを「鍵入力なし」で全利用者に提供する（proxy設定ガイド）

このフォルダの `worker.js` を **Cloudflare Workers（無料枠）** にデプロイすると、
アプリ利用者はAPIキーを入力しなくてもAIコーチを使えるようになります。
鍵（Anthropic APIキー）は Worker のサーバー秘密として保持され、ブラウザには渡りません。

> 仕組み: アプリ → あなたの Worker（鍵を付与）→ Anthropic、と中継します。
> 利用者は何も設定しません。あなたが一度だけ Worker を用意するだけです。

---

## 事前に知っておくこと（重要）

- **AIの利用料はあなた（Worker の鍵の持ち主）負担**になります。
- 公開URLなので**悪用対策**を入れます（呼び出し元の制限＋`max_tokens`上限）。さらに固くするには
  Cloudflare の **Rate Limiting** を併用してください（下記）。
- まずは小さく試し、想定外の課金が無いか Anthropic 側の使用量も確認してください。

---

## 手順（初回のみ・約10分）

### 1. Cloudflare アカウントを作る（無料）
https://dash.cloudflare.com/sign-up

### 2. Worker を作る
1. ダッシュボード左の **「Workers & Pages」** → **「Create application」** → **「Create Worker」**
2. 名前を付けて（例 `goalflow-ai`）**Deploy**
3. **「Edit code」** を開き、既定のコードを**全削除**して、このフォルダの **`worker.js` の中身を貼り付け** → **Deploy**

### 3. 鍵と許可オリジンを設定
作成した Worker の **「Settings」→「Variables and Secrets」**（または Variables）で：
- **Secret** を追加：名前 `ANTHROPIC_API_KEY` / 値 = あなたの Anthropic APIキー（`sk-ant-...`）
  - ※ console.anthropic.com で取得。**Secret** で登録すると値が隠されます。
- **Variable**（平文でOK）を追加：名前 `ALLOWED_ORIGIN` / 値 `https://taiyaki2718.github.io`
  - これでアプリのサイト以外からのブラウザ呼び出しを弾きます。

保存後、もう一度 **Deploy** してください（変数を反映するため）。

### 4. Worker のURLをコピー
Worker の概要に表示される `https://goalflow-ai.<あなた>.workers.dev` をコピーします。

### 5. アプリにURLを設定
`index.html` の次の行（先頭近く）にURLを入れてコミット＝公開すれば完了です：
```js
const AI_PROXY_URL = 'https://goalflow-ai.xxxx.workers.dev';
```
（このURL自体は秘密ではありません。秘密の鍵は Worker 側にあります。）

> 自分で編集せず、URLを私（開発担当）に伝えてもらえれば、こちらで設定してコミットします。

設定後、アプリの **「AIコーチ」タブ**を開くと、**鍵を入れずに**目標分解・相談・振り返りが使えます。

---

## 悪用・コスト対策（推奨）

- **Rate Limiting**：Cloudflare ダッシュボード → 対象 Worker の **Settings → 「Rate limiting rules」**（または Security → WAF）で、
  「同一IPから1分あたりN回まで」等のルールを追加。
- `worker.js` の `MAX_TOKENS_CAP`（既定2000）で1回の出力上限を制限済み。必要に応じて下げられます。
- `ALLOWED_ORIGIN` は必ず本番URLに設定（`*` のままにしない）。
- 使い過ぎが心配なら、Anthropic 側で**使用上限/予算アラート**を設定してください。

---

## proxy を使わない場合

`AI_PROXY_URL` を空のままにすると、アプリは従来どおり動きます：
- 目標→カレンダー自動割り当て（オートプラン）は**鍵不要**で利用可能。
- AIコーチ（対話/賢い分解）は、各利用者が「設定」で自分のキーを入れたときだけ利用可能（BYOK）。
