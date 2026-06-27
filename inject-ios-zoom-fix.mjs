#!/usr/bin/env node
// Inyecta un bloque <style id="ios-zoom-fix"> en todos los HTML del sitio para
// matar el "minizoom" que iOS Safari hace en modo PWA al interactuar con la
// página. Tres síntomas combinados:
//
//   1) Auto-zoom al enfocar un input con font-size < 16px (clásico de iOS).
//   2) Doble-tap-zoom (delay de 300 ms) que dispara accidentalmente.
//   3) Rebote elástico ("rubber-band") al hacer scroll arriba/abajo.
//
// El fix correspondiente:
//
//   1) Sube font-size a 16px en mobile para inputs/textarea/select (>=16px
//      es el umbral exacto que evita el auto-zoom). Excluye range/checkbox/
//      radio porque no aplica.
//   2) touch-action: manipulation en <html> permite scroll y pinch pero
//      desactiva el doble-tap-zoom y su delay.
//   3) overscroll-behavior: none en html+body anula el rebote elástico.
//
// Idempotente: detecta id="ios-zoom-fix" y salta. Ignora backup/, .git/,
// node_modules/, .claude/. Lo inyecta justo después de la meta viewport
// (siempre presente) para que aplique desde el primer paint.

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['backup', '.git', 'node_modules', '.claude']);

// Bloque compacto en una sola línea para minimizar diff.
const SNIPPET = '<style id="ios-zoom-fix">html{touch-action:manipulation}html,body{overscroll-behavior:none;-webkit-overflow-scrolling:touch}@media (max-width:768px){input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,select{font-size:16px!important}}</style>';

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
let injected = 0, skipped = 0, noViewport = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  if (html.includes('id="ios-zoom-fix"')) { skipped++; continue; }
  // Insertar tras la meta viewport (cerrada con > en cualquier formato).
  const vpRegex = /<meta\s+name=["']viewport["'][^>]*>/i;
  const m = html.match(vpRegex);
  if (!m) { noViewport++; continue; }
  const idx = m.index + m[0].length;
  html = html.slice(0, idx) + '\n' + SNIPPET + html.slice(idx);
  writeFileSync(file, html);
  injected++;
}

console.log(`HTML totales: ${files.length}`);
console.log(`inyectados: ${injected} | ya tenían fix: ${skipped} | sin viewport: ${noViewport}`);
