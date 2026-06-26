#!/usr/bin/env node
// Genera el dataset base del Vocabulario inglés a partir del banco Lexis EN
// (examen-data.js / examen-extra.js / examen-phrasal.js). El tema y la categoría
// (POS) definitivos los asigna el workflow de enriquecimiento; aquí se ponen
// valores provisionales + ejemplos reutilizados + falsi amici + phrasal.
// Salida: vocab-ingles.json  y  vocab-enrich-input.jsonl

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (f) => readFileSync(join(__dirname, f), 'utf8');
const sandbox = { window: {} };
const run = (code) => new Function('window', code)(sandbox.window);
run(load('examen-data.js'));
run(load('examen-extra.js'));
run(load('examen-phrasal.js'));

const ITEMS = sandbox.window.LEXIS_ITEMS || [];
const RICH = sandbox.window.LEXIS_RICH || {};
const PHRASAL = sandbox.window.LEXIS_PHRASAL || [];

// categoría provisional (la corrige el enriquecedor)
function detectCat(w, es, isExpr) {
  if (isExpr) return 'Expresion';
  const t = es.trim().toLowerCase();
  if (/^(el|la|los|las|un|una)\s/.test(t)) return 'Nombre';
  const esFirst = (t.split(/[\/,]/)[0] || '').trim();
  if (/(ar|er|ir|arse|erse|irse)$/.test(esFirst) && esFirst.length > 3) return 'Verbo';
  if (/ly$/.test(w)) return 'Adverbio';
  if (/(tion|sion|ment|ness|ity|ship|hood|ance|ence|ism)$/.test(w)) return 'Nombre';
  if (/mente$/.test(esFirst)) return 'Adverbio';
  return 'Adjetivo';
}

const richByWord = {};
(RICH.gap || []).forEach((g) => { richByWord[g.w] = { ex: g.blank ? g.blank.replace(/_{2,}/, g.w) : null, def: g.def }; });
(RICH.syn || []).forEach((s) => { richByWord[s.w] = Object.assign(richByWord[s.w] || {}, { ex: s.sent || (richByWord[s.w] || {}).ex, syn: s.syn, def: s.def }); });
const trapByWord = {};
(RICH.traps || []).forEach((t) => { trapByWord[t.w] = t; });

const cards = [];
const seen = new Set();
let id = 0;
const top = (n) => n === 'A1' || n === 'A2' || n === 'B1';

for (const [w, es, cefr] of ITEMS) {
  if (seen.has(w)) continue;
  seen.add(w);
  id++;
  const trap = trapByWord[w];
  const rich = richByWord[w] || {};
  let tema = 'General', warn = null, t = es;
  if (trap) { tema = 'Falsos amigos'; warn = trap.note || null; t = trap.real || es; }
  cards.push({
    id, w, t, tema, cat: detectCat(w, es, false), gen: null,
    ex_en: rich.ex || '', ex_es: '', syn: rich.syn || null, warn,
    flags: { top: top(cefr) }, fn: null, reg: null, constr: null, nivel: cefr,
    _def: rich.def || null,
  });
}
for (const tr of (RICH.traps || [])) {
  if (seen.has(tr.w)) continue;
  seen.add(tr.w); id++;
  cards.push({ id, w: tr.w, t: tr.real, tema: 'Falsos amigos', cat: detectCat(tr.w, tr.real, false), gen: null,
    ex_en: '', ex_es: '', syn: null, warn: tr.note || null, flags: { top: top(tr.cefr) }, fn: null, reg: null, constr: null, nivel: tr.cefr, _def: null });
}
for (const p of PHRASAL) {
  if (seen.has(p.pv)) continue;
  seen.add(p.pv); id++;
  cards.push({ id, w: p.pv, t: p.es, tema: 'Phrasal verbs', cat: 'Expresion', gen: null,
    ex_en: p.sent || '', ex_es: '', syn: null, warn: null, flags: { top: top(p.cefr) }, fn: null, reg: null, constr: null, nivel: p.cefr, _def: p.def || null });
}

const clean = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, tema: c.tema, cat: c.cat, gen: null,
  ex_fr: c.ex_en || '', ex_es: '', syn: c.syn, warn: c.warn, flags: c.flags,
  fn: null, reg: null, constr: null, nivel: c.nivel,
}));
const enrich = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, cat: c.cat, nivel: c.nivel,
  isTrap: c.tema === 'Falsos amigos', isPhrasal: c.tema === 'Phrasal verbs',
}));

writeFileSync(join(__dirname, 'vocab-ingles.json'), JSON.stringify(clean, null, 2));
writeFileSync(join(__dirname, 'vocab-enrich-input.jsonl'), enrich.map((e) => JSON.stringify(e)).join('\n') + '\n');

const byCat = {}, byNivel = {};
let withEx = 0;
for (const c of clean) { byCat[c.cat] = (byCat[c.cat] || 0) + 1; byNivel[c.nivel] = (byNivel[c.nivel] || 0) + 1; if (c.ex_fr) withEx++; }
console.log('TOTAL:', clean.length, '| con ejemplo EN:', withEx);
console.log('niveles:', JSON.stringify(byNivel), '| cat:', JSON.stringify(byCat));
console.log('falsi amici:', clean.filter((c) => c.tema === 'Falsos amigos').length, '| phrasal:', clean.filter((c) => c.tema === 'Phrasal verbs').length);
console.log('batches enriquecimiento (40):', Math.ceil(clean.length / 40));
