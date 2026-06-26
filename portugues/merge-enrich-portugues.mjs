#!/usr/bin/env node
// Fusiona vocab-enrich-output.json en vocab-portugues.json: tema + categoría +
// ex_fr (ejemplo PT) + ex_es + género faltante. Conserva w/t/syn/warn/flags/nivel.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const p = (f) => join(__dirname, f);

const cards = JSON.parse(readFileSync(p('vocab-portugues.json'), 'utf8'));
const raw = JSON.parse(readFileSync(p('vocab-enrich-output.json'), 'utf8'));
const enriched = Array.isArray(raw) ? raw : (raw.enriched || []);

const TEMAS = new Set([
  'Medio ambiente','Tecnologia','Trabajo','Educación','Salud','Viajes','Sociedad',
  'Cultura y ocio','Alimentación','Transporte','Vivienda','Familia','Dinero y compras',
  'Medios de comunicación','Sentimientos','Personalidad','Tiempo y clima','Cuerpo y descripción',
  'Política y ciudadanía','Justicia y delitos','Igualdad y discriminación','Inmigración e interculturalidad',
  'Ciencia e investigación','Ciudad y urbanismo','Ropa y estilo','Deportes y actividad física','General',
  'Falsos amigos','Expresiones',
]);
const CATS = new Set(['Nombre', 'Verbo', 'Adjetivo', 'Adverbio', 'Expresion']);

const byId = new Map(enriched.map((e) => [e.id, e]));
let t = 0, cc = 0, ex = 0, g = 0, miss = 0;
for (const c of cards) {
  const e = byId.get(c.id);
  if (!e) { miss++; continue; }
  if (c.tema !== 'Falsos amigos' && c.tema !== 'Expresiones' && e.tema && TEMAS.has(e.tema)) { if (e.tema !== c.tema) t++; c.tema = e.tema; }
  if (c.tema !== 'Expresiones' && e.cat && CATS.has(e.cat)) { if (e.cat !== c.cat) cc++; c.cat = e.cat; }
  if (e.ex_pt && e.ex_pt.trim()) { c.ex_fr = e.ex_pt.trim(); ex++; }
  if (e.ex_es && e.ex_es.trim()) { c.ex_es = e.ex_es.trim(); }
  if (!c.gen && c.cat === 'Nombre' && (e.gen === 'm' || e.gen === 'f')) { c.gen = e.gen; g++; }
}
writeFileSync(p('vocab-portugues.json'), JSON.stringify(cards, null, 2));

const by = {}, byc = {};
let withEx = 0, withEs = 0;
for (const c of cards) { by[c.tema] = (by[c.tema] || 0) + 1; byc[c.cat] = (byc[c.cat] || 0) + 1; if (c.ex_fr) withEx++; if (c.ex_es) withEs++; }
console.log(`tema ${t} | cat ${cc} | ejemplo ${ex} | género ${g} | sin enriquecer ${miss}`);
console.log(`con ejemplo PT ${withEx}/${cards.length} | con ex_es ${withEs}/${cards.length} | cat:`, JSON.stringify(byc));
console.log('temas (top 14):'); Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log('  ', String(v).padStart(4), k));
