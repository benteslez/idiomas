#!/usr/bin/env node
// Inyecta un indicador discreto "Disponible sin conexión" al final del <body>
// de cada .html del sitio. El badge solo se hace visible cuando la página está
// EFECTIVAMENTE cacheada en el SW (caches.match) Y un service worker la está
// controlando (navigator.serviceWorker.controller). Si no, queda oculto.
//
// Idempotente: detecta el id #offlineReadyBadge y salta el archivo. Ignora
// backup/, .git/, node_modules/, .claude/. Inserta el snippet ANTES del bloque
// de registro del service worker para que el orden visual sea: contenido →
// badge → registro.

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['backup', '.git', 'node_modules', '.claude']);

// Snippet completo en una sola línea para minimizar diff y evitar conflictos
// con CSS de las páginas (los estilos van inline). Estilo: texto pequeño gris,
// centrado, con un punto verde con halo suave. Padding generoso abajo para
// separar del borde inferior. Usa fuentes del sistema, no depende del tema.
const SNIPPET = `<div id="offlineReadyBadge" hidden style="text-align:center;padding:18px 16px 26px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11px;color:#71717a;opacity:.78;letter-spacing:.02em;line-height:1.4"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;margin-right:7px;vertical-align:middle;box-shadow:0 0 0 3px rgba(16,185,129,.16)"></span>Disponible sin conexión</div>
<script>(function(){if(!('serviceWorker' in navigator)||!('caches' in window))return;var el;function show(){if(!el)el=document.getElementById('offlineReadyBadge');if(el)el.hidden=false;}function check(){if(!navigator.serviceWorker.controller)return;caches.match(location.href,{ignoreSearch:true}).then(function(hit){if(hit)show();}).catch(function(){});}if(document.readyState==='complete')check();else window.addEventListener('load',check);setTimeout(check,1500);})();</script>
`;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full, acc); }
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const files = walk(ROOT);
let injected = 0, skipped = 0, noBody = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  if (html.includes('offlineReadyBadge')) { skipped++; continue; }
  if (!html.includes('</body>')) { noBody++; continue; }

  // Insertar antes del registro del SW si existe, sino antes del último </body>.
  // El SW snippet está siempre al final del body cuando lo inyectó inject-sw.mjs.
  const swMarker = '<script>if("serviceWorker" in navigator)';
  const swIdx = html.indexOf(swMarker);
  if (swIdx !== -1) {
    html = html.slice(0, swIdx) + SNIPPET + html.slice(swIdx);
  } else {
    const bodyIdx = html.lastIndexOf('</body>');
    html = html.slice(0, bodyIdx) + SNIPPET + html.slice(bodyIdx);
  }
  writeFileSync(file, html);
  injected++;
}

console.log(`HTML totales: ${files.length}`);
console.log(`inyectados: ${injected} | ya tenían badge: ${skipped} | sin </body>: ${noBody}`);
