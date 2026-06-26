#!/usr/bin/env node
// Dataset base del Vocabulario portugués a partir del banco Lexis PT
// (examen-data.js / examen-extra.js / examen-phrasal.js). Género y categoría
// deterministas; tema y ejemplo bilingüe definitivos los pone el enriquecimiento.
// Salida: vocab-portugues.json  y  vocab-enrich-input.jsonl

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

const ART_M = new Set(['o', 'os', 'um', 'uns']);
const ART_F = new Set(['a', 'as', 'uma', 'umas']);
function splitArticle(w) {
  const m = w.match(/^([A-Za-zÀ-ÿ]+)\s+(.+)$/);
  if (m && (ART_M.has(m[1].toLowerCase()) || ART_F.has(m[1].toLowerCase()))) return [m[1].toLowerCase(), m[2]];
  return [null, w];
}
function detectGender(w, es) {
  const [art] = splitArticle(w);
  if (art) { if (ART_M.has(art)) return 'm'; if (ART_F.has(art)) return 'f'; }
  return null;
}
function detectCat(w, es, isExpr) {
  if (isExpr) return 'Expresion';
  const [art, rest] = splitArticle(w);
  if (art) return 'Nombre';
  const word = w.trim();
  if (/\s/.test(word) && word.split(/\s+/).length >= 3) return 'Expresion';
  if (/mente$/.test(word)) return 'Adverbio';
  const esFirst = (es.split(/[\/,]/)[0] || '').trim().toLowerCase();
  const esVerb = /(ar|er|ir|arse|erse|irse)$/.test(esFirst) && esFirst.length > 3;
  if (/(ar|er|ir|or)$/.test(word) && (esVerb || word.length > 4)) return 'Verbo';
  if (esVerb) return 'Verbo';
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
  seen.add(w); id++;
  const trap = trapByWord[w], rich = richByWord[w] || {};
  let tema = 'General', warn = null, t = es;
  if (trap) { tema = 'Falsos amigos'; warn = trap.note || null; t = trap.real || es; }
  const cat = detectCat(w, es, false);
  cards.push({ id, w, t, tema, cat, gen: cat === 'Nombre' ? detectGender(w, es) : null,
    ex_pt: rich.ex || '', ex_es: '', syn: rich.syn || null, warn,
    flags: { top: top(cefr) }, fn: null, reg: null, constr: null, nivel: cefr, _def: rich.def || null });
}
for (const tr of (RICH.traps || [])) {
  if (seen.has(tr.w)) continue;
  seen.add(tr.w); id++;
  const cat = detectCat(tr.w, tr.real, false);
  cards.push({ id, w: tr.w, t: tr.real, tema: 'Falsos amigos', cat, gen: cat === 'Nombre' ? detectGender(tr.w, tr.real) : null,
    ex_pt: '', ex_es: '', syn: null, warn: tr.note || null, flags: { top: top(tr.cefr) }, fn: null, reg: null, constr: null, nivel: tr.cefr, _def: null });
}
for (const p of PHRASAL) {
  if (seen.has(p.pv)) continue;
  seen.add(p.pv); id++;
  cards.push({ id, w: p.pv, t: p.es, tema: 'Expresiones', cat: 'Expresion', gen: null,
    ex_pt: p.sent || '', ex_es: '', syn: null, warn: null, flags: { top: top(p.cefr) }, fn: null, reg: null, constr: null, nivel: p.cefr, _def: p.def || null });
}

const clean = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, tema: c.tema, cat: c.cat, gen: c.gen,
  ex_fr: c.ex_pt || '', ex_es: '', syn: c.syn, warn: c.warn, flags: c.flags,
  fn: null, reg: null, constr: null, nivel: c.nivel,
}));
const enrich = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, cat: c.cat, nivel: c.nivel,
  isTrap: c.tema === 'Falsos amigos', isExpr: c.cat === 'Expresion',
}));
writeFileSync(join(__dirname, 'vocab-portugues.json'), JSON.stringify(clean, null, 2));
writeFileSync(join(__dirname, 'vocab-enrich-input.jsonl'), enrich.map((e) => JSON.stringify(e)).join('\n') + '\n');

const byCat = {}, byNivel = {};
let withGen = 0;
for (const c of clean) { byCat[c.cat] = (byCat[c.cat] || 0) + 1; byNivel[c.nivel] = (byNivel[c.nivel] || 0) + 1; if (c.gen) withGen++; }
console.log('TOTAL:', clean.length, '| con género:', withGen, '| falsos amigos:', clean.filter((c) => c.tema === 'Falsos amigos').length, '| expresiones:', clean.filter((c) => c.tema === 'Expresiones').length);
console.log('niveles:', JSON.stringify(byNivel), '| cat:', JSON.stringify(byCat));
console.log('batches enriquecimiento (40):', Math.ceil(clean.length / 40));
