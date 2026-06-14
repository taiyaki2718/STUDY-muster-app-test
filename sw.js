/* ============================================================
   GoalFlow Service Worker
   - Offline-first caching of the app shell, bundled audio,
     icons and the ESM (preact/htm) module graph.
   - Range-request aware media serving so the 4 BGM tracks
     play reliably offline (incl. iOS / Safari).
   ============================================================ */

const CACHE = 'goalflow-cache-v11';

// Assets fetched at install time (one-time download, ~16MB incl. audio).
// Promise.allSettled is used so a single failure never aborts install.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',

  // App icons
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',

  // Bundled ambient audio (Timer "環境音設定")
  './rain_against_the_glass.mp3',
  './notes_against_the_glass.mp3',
  './before_the_city_wakes.mp3',
  './keeping_out_the_cold.mp3',

  // ESM CDN entry points (transitive deps are cached on first online load)
  'https://esm.sh/preact@10.19.2',
  'https://esm.sh/preact@10.19.2/hooks',
  'https://esm.sh/htm@3.1.1/preact?external=preact'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Allow the page to trigger an immediate activation if desired.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* Build a 206 Partial Content response from a fully-cached body.
   Required for <audio> Range requests when serving from cache offline. */
async function buildRangeResponse(request, cachedResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return cachedResponse;

  const buffer = await cachedResponse.arrayBuffer();
  const total = buffer.byteLength;

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  let start = match && match[1] ? parseInt(match[1], 10) : 0;
  let end = match && match[2] ? parseInt(match[2], 10) : total - 1;

  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end) start = 0;

  const chunk = buffer.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(chunk.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // HTMLページ(ナビゲーション)は「ネット優先」：オンライン時は常に最新を取得し、
  // 取得できたらキャッシュも更新。オフライン時のみキャッシュを使う。
  // → デプロイ後の更新が即反映され、古い画面が残り続けない。
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const cached = (await caches.match('./index.html')) || (await caches.match(request));
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // その他(音源・アイコン・CDNモジュール)は「キャッシュ優先」：高速＆オフライン対応。
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      if (request.headers.get('range')) {
        try { return await buildRangeResponse(request, cached.clone()); }
        catch (e) { return cached; }
      }
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.status === 200 &&
          (response.type === 'basic' || response.type === 'cors' || response.type === 'default')) {
        const copy = response.clone();
        const cache = await caches.open(CACHE);
        cache.put(request, copy).catch(() => {});
      }
      return response;
    } catch (err) {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
