# 収益化（フリーミアム: Pro 月額 / 年額）セットアップ

方針: **基本機能はずっと無料**、AIではない付加価値（プレミアムテーマ等）を **Pro（有料サブスク）** にする。
無料版は全機能維持・ペイウォールは閉じられる（North Star: ダークパターン禁止）。

仕組み: 決済は外部サービスが担当し、**購入時に「ライセンス鍵」が発行される** → アプリがその鍵を
**ライセンス検証APIで確認**して Pro を解放（バックエンド不要、ブラウザから直接検証）。

---

## 1. 決済サービスを用意（おすすめ: Lemon Squeezy）

Lemon Squeezy は個人開発者向けで、**消費税/VATを代行（merchant of record）**、**月額/年額サブスク**、
**ライセンス鍵＋検証API** を備えています。

1. https://lemonsqueezy.com で登録 → Store を作成
2. **Product** を作成（例: "GoalFlow Pro"）。**Variants** で2つの価格を用意：
   - **Monthly**（例 ¥480/月）
   - **Annual**（例 ¥3,800/年）
   - 各 Variant の **License keys** を有効化（購入時に鍵を発行する設定）
3. それぞれの **購入URL（Buy link / Checkout URL）** を控える（月額用・年額用）

> Gumroad でも同様（サブスク＋ライセンス）。Stripe単体はサブスク可だが検証にWebhook/簡易backendが要るので、
> バックエンド無しを保つなら Lemon Squeezy / Gumroad が手軽です。

## 2. アプリに反映（`index.html` 先頭付近の `PRO`）

```js
const PRO = {
  monthlyUrl: 'https://your-store.lemonsqueezy.com/buy/xxxx-monthly',
  annualUrl:  'https://your-store.lemonsqueezy.com/buy/xxxx-annual',
  monthlyPrice: '¥480 / 月',
  annualPrice:  '¥3,800 / 年',
  annualSave:   '2ヶ月分お得（約34% OFF）',
  validateUrl:  'https://api.lemonsqueezy.com/v1/licenses/validate'  // Lemon Squeezy のライセンス検証API
};
```
- これで「設定 → Pro にアップグレード」に **月額/年額カード**が出て、購入後に届くライセンス鍵で有効化できます。
- 価格表記（`monthlyPrice` 等）は表示用。実際の課金額は決済サービス側の設定が正です。
- 自分で編集せず、URL類を開発担当に伝えてもらえれば設定します。

## 3. 動作と注意

- **検証**: `validateUrl` に `{ "license_key": "..." }` をPOSTし、`valid` と `license_key.status==='active'` を確認。
  サブスク解約/期限切れで status が変わると Pro は自動的に外れます（起動時にベストエフォート再検証）。
- **オフライン/検証エラー時**は Pro 状態を維持（誤って無料化しない）。「無効」が確定した時だけ解除。
- **CORS**: ブラウザから検証APIを直接呼びます。もし将来 CORS で弾かれる場合は、ごく薄い中継（Cloudflare Worker）を
  挟めばOK（`validateUrl` をその中継URLに変えるだけ）。
- **クライアント側の限界**: テーマ等ローカル機能のゲートはコピーで回避可能ですが、誠実なユーザーは購入します。
  本当に厳密に守りたい高価値機能が出てきたら、サーバー検証必須の設計（Worker）に寄せます。

## 4. Pro機能の増やし方

`isProActive(pro)` が Pro 判定。新しい有料機能はこのフラグでゲートし、無料には影響させない（無料を削らない）。
現状の Pro 機能はプレミアムテーマ（アクセントカラー）。今後候補: 詳細解析、テーマ追加、エクスポート形式 等。

---

## 補足: 寄付/サポート（任意・併用可）
`SUPPORT`（Ko-fi / Buy Me a Coffee / GitHub Sponsors / PayPal の各URL）を入れると、設定に「応援する」ボタン、
`.github/FUNDING.yml` で GitHub の Sponsor ボタンも出せます（未設定の項目は非表示）。サブスクと併用できます。
