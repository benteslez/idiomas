/* Service worker de "Mis Idiomas" — acceso sin conexión.
 * Estrategia: cacheo bajo demanda. Cualquier página que se abra con conexión
 * queda guardada y luego disponible offline. Las fuentes de Google también.
 * El progreso (SRS, etc.) vive en localStorage; la sync con Supabase se deja
 * pasar a la red y tiene su propio fallback offline en la app. */

// v2: arregla respuestas redirigidas en caché que rompían navegaciones
// (el navegador rechaza una Response con .redirected=true al servirla para
// un request en modo navigate, dejando la pestaña en blanco y atascando el
// botón "volver"). Bumpear la versión purga la caché antigua corrupta.
const VERSION = 'v2';
const CACHE = 'idiomas-' + VERSION;
const NAV_TIMEOUT_MS = 6000;

// Recursos mínimos para que el índice arranque sin conexión.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // allSettled: que un recurso ausente no aborte la instalación.
    await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Permite que la página fuerce activar una versión nueva del SW sin esperar.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

// Recrea la Response sin el flag `redirected`. Imprescindible antes de cachear
// respuestas que se servirán a navegaciones: el navegador rechaza con TypeError
// una Response.redirected===true devuelta a un request en modo 'navigate'.
async function cleanResponseForCache(response) {
  if (!response || !response.redirected) return response;
  const body = await response.clone().blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const fetching = fetch(req).then(async (res) => {
    if (res && res.ok) {
      const clean = await cleanResponseForCache(res.clone());
      cache.put(req, clean).catch(() => {});
    }
    return res;
  }).catch(() => null);
  // Mantén el fetch vivo aunque devolvamos hit inmediatamente, para que la
  // caché se refresque en segundo plano sin que el browser mate el SW antes.
  if (event && hit) { try { event.waitUntil(fetching); } catch (e) {} }
  return hit || (await fetching) || Response.error();
}

// Timeout para fetch: en redes lentas evita que el navegador se cuelgue 30 s
// antes de caer al fallback de caché.
function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then((res) => { clearTimeout(t); resolve(res); },
                    (err) => { clearTimeout(t); reject(err); });
  });
}

async function networkFirst(req, event) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetchWithTimeout(req, NAV_TIMEOUT_MS);
    // Solo cacheamos respuestas 2xx limpias. Saltamos 3xx/4xx/5xx para no
    // contaminar la caché con páginas de error o redirects intermedios.
    if (res && res.ok) {
      const clean = await cleanResponseForCache(res.clone());
      cache.put(req, clean).catch(() => {});
    }
    return res;
  } catch (e) {
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    // último recurso: el índice cacheado
    const idx = (await cache.match('./index.html')) || (await cache.match('./'));
    if (idx) return idx;
    return offlineFallback(req);
  }
}

// Página de fallback con enlace al índice + botón "Reintentar" para que el
// usuario NO se quede atrapado si cae en este 503.
function offlineFallback(req) {
  const targetUrl = (req && req.url) || '/';
  let originRoot = '/';
  try { originRoot = new URL('./', self.location.href).pathname; } catch (e) {}
  const indexHref = originRoot + 'index.html';
  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Sin conexión · Mis Idiomas</title>' +
    '<style>' +
    'html,body{height:100%}' +
    'body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;' +
    'background:#f3f1ec;color:#1a1814;display:flex;align-items:center;justify-content:center;padding:24px}' +
    '.box{max-width:420px;text-align:center;background:#fbfaf6;border:1px solid #e2ddd0;border-radius:18px;' +
    'padding:32px 28px;box-shadow:0 2px 14px rgba(0,0,0,.08)}' +
    'h1{font-size:1.3rem;margin:0 0 8px;letter-spacing:-.01em}' +
    'p{font-size:.92rem;color:#44413a;line-height:1.55;margin:0 0 18px}' +
    '.actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
    'a,button{font:inherit;font-size:.9rem;font-weight:600;padding:10px 18px;border-radius:10px;' +
    'border:1px solid #7a5a0a;background:#7a5a0a;color:#fff;text-decoration:none;cursor:pointer;display:inline-block}' +
    'a.alt,button.alt{background:transparent;color:#7a5a0a}' +
    '.url{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.72rem;color:#706c64;' +
    'word-break:break-all;margin-top:14px;opacity:.7}' +
    '</style></head><body>' +
    '<div class="box">' +
    '<h1>Sin conexión</h1>' +
    '<p>Esta página todavía no estaba guardada para usar offline. Conéctate y vuelve a abrirla una vez para que quede disponible sin conexión.</p>' +
    '<div class="actions">' +
    '<button onclick="location.reload()">Reintentar</button>' +
    '<a class="alt" href="' + indexHref + '">Volver al índice</a>' +
    '</div>' +
    '<div class="url">' + targetUrl.replace(/[<>&"']/g, '') + '</div>' +
    '</div></body></html>';
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    status: 503,
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // POST/PUT (Supabase) → red directa
  const url = new URL(req.url);

  if (url.hostname.endsWith('supabase.co')) return; // sync → no interceptar

  if (isFont(url)) { event.respondWith(cacheFirst(req)); return; }

  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, event)); return; }

  if (url.origin === self.location.origin) { event.respondWith(staleWhileRevalidate(req, event)); return; }
});
