#!/usr/bin/env node
// Inyecta el registro del service worker (acceso sin conexión) en todas las
// páginas .html del sitio que aún no lo tengan, con la ruta relativa correcta
// a /sw.js según la profundidad. Idempotente. Ignora backup/ y .git/.

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['backup', '.git', 'node_modules', '.claude']);

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
  if (html.includes('serviceWorker.register')) { skipped++; continue; }
  if (!html.includes('</body>')) { noBody++; continue; }

  // ruta relativa desde la carpeta del archivo hasta la raíz (donde vive sw.js)
  let rel = relative(dirname(file), ROOT).split('\\').join('/');
  const prefix = rel === '' ? './' : rel + '/';
  const swPath = prefix + 'sw.js';

  const snippet =
    '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){' +
    'navigator.serviceWorker.register("' + swPath + '",{scope:"' + prefix + '"}).catch(function(){});});}</script>\n';

  // inyectar antes del último </body>
  const idx = html.lastIndexOf('</body>');
  html = html.slice(0, idx) + snippet + html.slice(idx);
  writeFileSync(file, html);
  injected++;
}

console.log(`HTML totales: ${files.length}`);
console.log(`inyectados: ${injected} | ya tenían SW: ${skipped} | sin </body>: ${noBody}`);
