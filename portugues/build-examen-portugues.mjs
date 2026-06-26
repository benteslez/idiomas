#!/usr/bin/env node
// Genera portugues/examen.html a partir del motor italiano/examen.html (Lexis),
// localizado a portugués: acento teal, namespace localStorage lexispt, etiquetas
// PT↔ES / falsos amigos, índice orientativo CELPE-Bras. (El registro del SW ya
// viene en el original.) Aserciones: aborta si un marcador no aparece.

import { readFileSync, writeFileSync } from 'node:fs';
const IT = '/Users/Ruben/Documents/GitHub/idiomas/italiano/examen.html';
let out = readFileSync(IT, 'utf8');
const reps = [];
const rep = (f, r, n = 1) => reps.push([f, r, n]);

// título
rep('<title>Lexis IT · Examen adaptativo de vocabulario italiano (A1–C2)</title>',
    '<title>Lexis PT · Examen adaptativo de vocabulario portugués (A1–C2)</title>', 1);
// metas PWA (manifest + apple) tras el título
rep('<title>Lexis PT · Examen adaptativo de vocabulario portugués (A1–C2)</title>',
    '<title>Lexis PT · Examen adaptativo de vocabulario portugués (A1–C2)</title>\n'
    + '<link rel="manifest" href="../manifest.webmanifest">\n'
    + '<link rel="apple-touch-icon" href="../apple-touch-icon.png">\n'
    + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    + '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
    + '<meta name="apple-mobile-web-app-title" content="Lexis PT">\n'
    + '<meta name="mobile-web-app-capable" content="yes">\n'
    + '<meta name="theme-color" content="#15607a">', 1);
// acento (verde IT -> teal PT)
rep('--accent:#1f6e44; --accent-light:#d8eee0; --accent-mid:#4a9e6e;',
    '--accent:#15607a; --accent-light:#d9edf3; --accent-mid:#4a93ac;', 1);
// namespace de progreso independiente
rep('lexisit', 'lexispt', 19);
// back-btn
rep('‹</span> Italiano · Riferimento</a>', '‹</span> Português · Referência</a>', 1);
// textos descriptivos
rep('Examen <em>adaptativo</em> de vocabulario italiano', 'Examen <em>adaptativo</em> de vocabulario portugués', 1);
rep('</b> términos italianos A1–C2', '</b> términos portugueses A1–C2', 1);
rep('al estilo <b>PLIDA / CILS</b>', 'al estilo <b>CELPE-Bras</b>', 1);
rep('IT↔ES', 'PT↔ES', 2);
rep('<b>falsi amici</b> (falsos amigos)', '<b>falsos amigos</b>', 1);
// etiquetas de tema (chips + config) IT -> ES (las claves data-theme="pv"/"traps" no cambian)
rep('Espressioni', 'Expresiones', 2);
rep('Falsi amici', 'Falsos amigos', 2);
// CILS -> CELPE (restantes: nota, gauge, result, comentario)
rep('La escala tipo CILS es', 'La escala tipo CELPE-Bras es', 1);
rep('CILS <b id="g-cam">', 'CELPE <b id="g-cam">', 1);
rep('<div class="k">CILS (orient.)</div>', '<div class="k">CELPE (orient.)</div>', 1);
rep('Índice CILS orientativo', 'Índice CELPE-Bras orientativo', 1);

// aplicar con verificación
for (const [f, r, n] of reps) {
  const count = out.split(f).length - 1;
  if (count !== n) throw new Error(`Marcador inesperado (${count}≠${n}): ${JSON.stringify(f.slice(0, 50))}`);
  out = out.split(f).join(r);
}
// guardas: no deben quedar restos
for (const stray of ['lexisit', 'PLIDA / CILS', 'CILS', 'IT↔ES', 'vocabulario italiano', 'términos italianos', 'Espressioni', 'Falsi amici']) {
  if (out.includes(stray)) throw new Error('Resto sin localizar: ' + stray);
}
writeFileSync('/Users/Ruben/Documents/GitHub/idiomas/portugues/examen.html', out);
console.log('OK -> portugues/examen.html (' + out.length + ' bytes)');
