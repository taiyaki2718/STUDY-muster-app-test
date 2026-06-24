# 収益化（寄付/サポート方式）セットアップ

このアプリは **全機能を無料**のまま、押し付けない「応援（寄付）」導線だけを置く方針です
（North Star: ダークパターン・課金ゲート・罪悪感商法は禁止）。
設定すると **設定タブに「応援する」ボタン**が出て、GitHubには「Sponsor」ボタンが出ます。

---

## 1. 受け取り口を1つ作る（5〜10分・どれか1つでOK）

| サービス | 特徴 | 作る場所 |
|---|---|---|
| **Ko-fi**（おすすめ） | 手数料ほぼ0、単発チップ＋月額メンバー対応、国際対応 | https://ko-fi.com |
| Buy Me a Coffee | 同様、UIが軽い | https://www.buymeacoffee.com |
| GitHub Sponsors | 開発者向け。要審査・銀行登録 | https://github.com/sponsors |
| PayPal.me | 既にPayPalがあれば最速 | https://paypal.me |

> まずは **Ko-fi か PayPal.me** が最短です。アカウントを作ると `https://ko-fi.com/あなた` のような
> URL（または `あなた` というID）が手に入ります。

## 2. アプリに反映する（2か所・任意）

### (a) アプリ内「応援する」ボタン
`index.html` の先頭付近にある `SUPPORT` に、作ったURLを入れてコミット＝公開：
```js
const SUPPORT = {
  kofi:   'https://ko-fi.com/yourname',
  bmac:   '',
  github: '',
  paypal: 'https://www.paypal.me/yourname'
};
```
- 入れた項目だけボタンが表示されます（空はゼロ表示なので壊れません）。
- 自分で編集せず、URLを開発担当に伝えてもらえれば設定します。

### (b) GitHubの「Sponsor」ボタン
`.github/FUNDING.yml` の該当行の「# 」を外してIDを入れる：
```yaml
ko_fi: yourname
# custom: ["https://www.paypal.me/yourname"]
```

## 3. AIコーチのコストについて（重要）

寄付方式は**機能をゲートしません**。一方 AIコーチ（Claude API）はオーナーに**実費**が発生します。
- **推奨**：AIは **BYOK**（各利用者が自分のキーを入れる）のままにする（= `AI_PROXY_URL` は空）。
  これならオーナーにAI費用はかかりません。寄付は「アプリ全体への応援」になります。
- proxy（`AI_PROXY_URL`）を設定して全員に無料でAIを出す場合、**AI費用はオーナー負担**です。
  `ai-proxy/worker.js` の `MAX_TOKENS_CAP` と Cloudflare の Rate Limiting で上限を必ず設定してください。
  寄付がAI費用を上回る保証はないため、少額から様子見を推奨します。

---

## 補足：もっと収益化したくなったら
寄付では物足りなくなった場合、将来的に「フリーミアム（AIコーチを有料Pro化）」へ拡張できます。
その場合は Lemon Squeezy 等のライセンス鍵を `ai-proxy/worker.js` で検証して AI をゲートします
（設計済みの拡張ポイント）。必要になったら相談してください。
