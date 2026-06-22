/* ============================================================
   GoalFlow AI proxy — Cloudflare Worker
   ------------------------------------------------------------
   アプリ利用者が「APIキー入力なし」でAIコーチを使えるようにするための
   小さな中継サーバー。Anthropic の鍵は Worker の「秘密(Secret)」として保持し、
   ブラウザには一切渡さない。

   設定する環境変数（Cloudflare の Worker 設定画面で登録）:
     - ANTHROPIC_API_KEY  … あなたの Anthropic APIキー（Secret として登録）
     - ALLOWED_ORIGIN     … 許可する呼び出し元。例: https://taiyaki2718.github.io
                            （未設定なら全許可 '*'。本番では必ず設定する）

   コスト保護: 1リクエストあたり max_tokens を MAX_TOKENS_CAP に制限。
   さらに強固にするには Cloudflare の Rate Limiting / WAF を併用する（README参照）。
   ============================================================ */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS_CAP = 2000; // 1回の出力上限（コスト暴走の防止）

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || '*';
    const origin = request.headers.get('Origin') || '';
    const acao = allowed === '*' ? '*' : allowed;
    const cors = {
      'Access-Control-Allow-Origin': acao,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin'
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors, 'content-type': 'application/json' }
    });

    // CORS プリフライト
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: { message: 'Method Not Allowed' } }, 405);

    // 呼び出し元の制限（ブラウザからの他サイト悪用を抑止。curl 等は Origin を偽装可能なので
    // 完全な防御にはならない点に注意。Rate Limiting の併用を推奨）。
    if (allowed !== '*' && origin && origin !== allowed) return json({ error: { message: 'Forbidden origin' } }, 403);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { message: 'Proxy is missing the ANTHROPIC_API_KEY secret.' } }, 500);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: { message: 'Invalid JSON body' } }, 400); }

    // コスト保護: max_tokens を上限でクランプ
    body.max_tokens = Math.min(typeof body.max_tokens === 'number' ? body.max_tokens : MAX_TOKENS_CAP, MAX_TOKENS_CAP);

    let upstream;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return json({ error: { message: 'Upstream request failed' } }, 502);
    }

    // 応答（通常JSON も SSEストリーム も）をそのまま中継し、CORS を付与
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', acao);
    headers.set('Vary', 'Origin');
    headers.delete('content-encoding'); // 二重圧縮の防止
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
