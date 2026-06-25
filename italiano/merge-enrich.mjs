#!/usr/bin/env node
// Fusiona el resultado del workflow de enriquecimiento (vocab-enrich-output.json)
// dentro de vocab-italiano.json. Conserva w/t/cat/syn/warn/flags/nivel; actualiza
// tema + ex_fr (ejemplo IT) + ex_es (traducción) + género faltante.
// Uso: node merge-enrich.mjs   (luego: node build-vocab-italiano.mjs)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const p = (f) => join(__dirname, f);

const cards = JSON.parse(readFileSync(p('vocab-italiano.json'), 'utf8'));
let out = JSON.parse(readFileSync(p('vocab-enrich-output.json'), 'utf8'));
// admite tanto el array directo como {enriched:[...]}
const enriched = Array.isArray(out) ? out : (out.enriched || []);

const TAXONOMY = new Set([
  'Medio ambiente','Tecnologia','Trabajo','Educación','Salud','Viajes','Sociedad',
  'Cultura y ocio','Alimentación','Transporte','Vivienda','Familia','Dinero y compras',
  'Medios de comunicación','Sentimientos','Personalidad','Tiempo y clima','Cuerpo y descripción',
  'Política y ciudadanía','Justicia y delitos','Igualdad y discriminación','Inmigración e interculturalidad',
  'Ciencia e investigación','Ciudad y urbanismo','Ropa y estilo','Deportes y actividad física','General',
  'Falsos amigos','Expresiones',
]);

const byId = new Map(enriched.map((e) => [e.id, e]));
let appliedTema = 0, appliedEx = 0, appliedGen = 0, missing = 0;

for (const c of cards) {
  const e = byId.get(c.id);
  if (!e) { missing++; continue; }
  // tema: falsi amici / expresiones se respetan siempre
  if (c.tema !== 'Falsos amigos' && c.tema !== 'Expresiones') {
    if (e.tema && TAXONOMY.has(e.tema)) { if (e.tema !== c.tema) appliedTema++; c.tema = e.tema; }
  }
  if (e.ex_it && e.ex_it.trim()) { c.ex_fr = e.ex_it.trim(); appliedEx++; }
  if (e.ex_es && e.ex_es.trim()) { c.ex_es = e.ex_es.trim(); }
  if (!c.gen && c.cat === 'Nombre' && (e.gen === 'm' || e.gen === 'f')) { c.gen = e.gen; appliedGen++; }
}

writeFileSync(p('vocab-italiano.json'), JSON.stringify(cards, null, 2));

const byTema = {};
let withEx = 0, withEs = 0;
for (const c of cards) { byTema[c.tema] = (byTema[c.tema] || 0) + 1; if (c.ex_fr) withEx++; if (c.ex_es) withEs++; }
console.log(`fusionados: tema cambiado ${appliedTema} | ejemplo IT ${appliedEx} | género ${appliedGen} | sin enriquecer ${missing}`);
console.log(`con ejemplo IT: ${withEx}/${cards.length} | con ex_es: ${withEs}/${cards.length}`);
console.log('por tema:'); Object.entries(byTema).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ', v.toString().padStart(4), k));
