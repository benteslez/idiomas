/* Service worker de "Mis Idiomas" — acceso sin conexión.
 * Estrategia: cacheo bajo demanda. Cualquier página que se abra con conexión
 * queda guardada y luego disponible offline. Las fuentes de Google también.
 * El progreso (SRS, etc.) vive en localStorage; la sync con Supabase se deja
 * pasar a la red y tiene su propio fallback offline en la app. */

const VERSION = 'v1';
const CACHE = 'idiomas-' + VERSION;

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

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const fetching = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await fetching) || Response.error();
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    // último recurso: el índice cacheado
    const idx = (await cache.match('./index.html')) || (await cache.match('./'));
    if (idx) return idx;
    return new Response(
      '<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#444">' +
      '<h2>Sin conexión</h2><p>Esta página todavía no está guardada para uso offline. Ábrela una vez con conexión.</p></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // POST/PUT (Supabase) → red directa
  const url = new URL(req.url);

  if (url.hostname.endsWith('supabase.co')) return; // sync → no interceptar

  if (isFont(url)) { event.respondWith(cacheFirst(req)); return; }

  if (req.mode === 'navigate') { event.respondWith(networkFirst(req)); return; }

  if (url.origin === self.location.origin) { event.respondWith(staleWhileRevalidate(req)); return; }
});
