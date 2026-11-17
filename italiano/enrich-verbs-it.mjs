#!/usr/bin/env node
// Enriquecimiento del array V[] de italiano/verbos.html.
//
// AÑADE campos nuevos a cada verbo SIN tocar los existentes. El render
// actual (pr/im/pc/fs/co/sb/ip) sigue funcionando exactamente igual; los
// campos nuevos los consumirá el próximo rediseño de UI.
//
// Añade por verbo:
//   - aux: "avere" | "essere"
//   - pattern: "are" | "ere" | "ire" | "isc" | "irregular"
//   - pp: participio pasado base (para concordancia con essere)
//   - ppr: participio presente (puede ser null)
//   - ger: gerundio simple
//   - pr2: passato remoto (6 formas)
//   - sbi: congiuntivo imperfetto (6 formas)
//   - ipN: imperativo con 5 personas (tu/Lei/noi/voi/Loro) + negativo
//   - reflexive: true para verbos en -si
//   - verify: array de campos marcados como inseguros (para revisión)
//
// Estrategia:
//   · 16 verbos tienen tabla explícita en data/irregulars-it.json → sus
//     overrides sobrescriben cualquier regla.
//   · El resto se genera por reglas regulares según el pattern inferido.
//   · Para verbos con flags.irreg=true que NO están en irregulars-it.json
//     se marca verify:['pr2'] (su passato remoto es probablemente irregular
//     y la regla no vale).
//   · Reflexivos: se generan sobre el verbo base no-reflexivo + se re-inserta
//     el clítico "mi/ti/si/ci/vi/si". Marcar verify si el verbo base también
//     es irregular.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { END, stemOf, conjugate } from './conj-it.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, 'verbos.html');
const IRREG_PATH = join(__dirname, 'data/irregulars-it.json');

const IRREG = JSON.parse(readFileSync(IRREG_PATH, 'utf8'));
const REFL_CLITICS = ['mi', 'ti', 'si', 'ci', 'vi', 'si'];

// ───────────────────────────────────────────────────────────────────────────
// 1. Leer V[] del HTML preservando la posición exacta para reescribir después.
// ───────────────────────────────────────────────────────────────────────────
const html = readFileSync(HTML_PATH, 'utf8');
const V_START_MARKER = '\nconst V = [\n';
// El cierre es un "\n];" seguido de la línea de merge de customVerbs. Es
// el patrón canónico que vive desde el template francés y no muta.
const V_END_MARKER   = '\n];\n\n// Merge custom verbs';
const vStart = html.indexOf(V_START_MARKER);
const vEnd   = html.indexOf(V_END_MARKER, vStart);
if (vStart < 0 || vEnd < 0) throw new Error('No se localizan los marcadores de V[] en verbos.html');

const arrSrc = html.slice(vStart + 1, vEnd + 2);  // incluye "const V = [...\n];"
const V = (0, eval)('(function(){ ' + arrSrc + '; return V; })()');
console.log(`Leídos ${V.length} verbos del corpus.`);

// ───────────────────────────────────────────────────────────────────────────
// 2. Inferir pattern + extraer pp + detectar reflexivos.
// ───────────────────────────────────────────────────────────────────────────
function inferPattern(v, pr) {
  // v: "parlare", "finire", "alzarsi", …
  // pr: [["io","parlo"], ["tu","parli"], …]  (primera forma personal sin clítico)
  const inf = v.endsWith('si') ? v.slice(0, -2) + 'e' : v;
  if (inf.endsWith('are')) return 'are';
  if (inf.endsWith('ere')) return 'ere';
  if (inf.endsWith('ire')) {
    // Detecta -isc- mirando la 1ª persona del presente: "finisco" vs "sento".
    const io = (pr && pr[0] && pr[0][1]) || '';
    const stripClitic = io.replace(/^(mi|ti|si|ci|vi)\s+/, '');
    return stripClitic.endsWith('isco') ? 'isc' : 'ire';
  }
  return 'irregular';
}

function extractPp(pcFirst, isReflexive) {
  // pcFirst = "ho fatto" | "sono stato/a" | "mi sono alzato/a"
  if (!pcFirst) return null;
  let s = pcFirst;
  if (isReflexive) s = s.replace(/^(mi|ti|si|ci|vi)\s+/, '');
  // Quita el auxiliar (primer token)
  const parts = s.split(/\s+/);
  const ppWithSuffix = parts.slice(1).join(' ');
  // Quita "/a", "/a/i/e" o similar al final
  return ppWithSuffix.replace(/\/[a-z\/]+$/, '').trim() || null;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Enriquecer cada verbo.
// ───────────────────────────────────────────────────────────────────────────
function enrichVerb(v) {
  const isReflexive = v.v.endsWith('si') && /[aei]r(si)$/.test(v.v);
  const pattern = inferPattern(v.v, v.pr);
  const baseInf = isReflexive ? v.v.slice(0, -2) + 'e' : v.v;
  const aux = (v.flags && v.flags.etre) ? 'essere' : 'avere';
  const pp  = extractPp(v.pc && v.pc[0] && v.pc[0][1], isReflexive);
  const verify = [];

  // ─ Metadata base ─
  const out = {
    ...v,
    aux,
    pattern,
    pp,
    reflexive: isReflexive || undefined,
  };

  // ─ Casos con tabla explícita (16 verbos) ─
  const irregKey = isReflexive ? baseInf : v.v;
  const hasIrreg = Object.prototype.hasOwnProperty.call(IRREG, irregKey);

  if (hasIrreg) {
    const meta = IRREG[irregKey];
    const o = { ...(meta.override || {}) };
    if (meta.pp  !== undefined && o.pp  === undefined) o.pp  = meta.pp;
    if (meta.ger !== undefined && o.ger === undefined) o.ger = meta.ger;
    if (meta.ppr !== undefined && o.ppr === undefined) o.ppr = meta.ppr;

    const conj = conjugate({
      v: baseInf,
      pattern: meta.pattern,
      override: o,
      aux: meta.aux,
    });

    out.pattern = meta.pattern;
    out.aux     = meta.aux;
    out.pp      = conj.pp;
    out.ppr     = conj.ppr;
    out.ger     = conj.ger;
    out.pr2     = conj.pr2;
    out.sbi     = conj.sbi;
    out.ipN     = conj.ipN;
  } else if (['are', 'ere', 'ire', 'isc'].includes(pattern)) {
    // ─ Patrón regular conocido: usar reglas + stem ─
    const stem = stemOf(baseInf, pattern);
    const end = END[pattern];
    out.pr2 = end.pr2.map(e => stem + e);
    out.sbi = end.sbi.map(e => stem + e);
    out.ger = stem + end.ger;
    out.ppr = stem + end.ppr;
    if (!out.pp) out.pp = stem + end.pp;

    // Imperativo 5 personas: tu/Lei/noi/voi + Loro (derivado del cong presente)
    const ipAff = [
      [stem + end.ip[0]],  // tu
      [stem + end.ip[1]],  // Lei
      [stem + end.ip[2]],  // noi
      [stem + end.ip[3]],  // voi
      [stem + end.ip[4]],  // Loro
    ];
    const ipNeg = [
      ['non ' + baseInf],  // tu = non + infinito
      ['non ' + stem + end.ip[1]],
      ['non ' + stem + end.ip[2]],
      ['non ' + stem + end.ip[3]],
      ['non ' + stem + end.ip[4]],
    ];
    out.ipN = { aff: ipAff, neg: ipNeg };

    // Flag irregular sin tabla: su pr2 no vale la pena fiar
    if (v.flags && v.flags.irreg) {
      verify.push('pr2');
    }
  } else {
    // ─ No sabemos qué hacer: todo marcado ─
    verify.push('pr2', 'sbi', 'ipN');
    out.pr2 = null;
    out.sbi = null;
    out.ipN = null;
  }

  // ─ Reflexivos: añadir clíticos a las formas generadas ─
  if (isReflexive && out.pr2 && Array.isArray(out.pr2)) {
    out.pr2 = out.pr2.map((form, i) => REFL_CLITICS[i] + ' ' + form);
    out.sbi = out.sbi.map((form, i) => REFL_CLITICS[i] + ' ' + form);
    // Imperativo reflexivo: tu "alzati" (postposición del clítico), Lei "si alzi"
    // La forma del imperativo reflexivo es compleja — mejor marcar verify.
    verify.push('ipN');
    out.ipN = null;
  }

  if (verify.length > 0) out.verify = verify;
  return out;
}

const enriched = V.map(enrichVerb);

// ───────────────────────────────────────────────────────────────────────────
// 4. Estadísticas + lista verify.
// ───────────────────────────────────────────────────────────────────────────
const toVerify = enriched.filter(v => v.verify && v.verify.length > 0);
const auxEssere = enriched.filter(v => v.aux === 'essere').length;
const patternCount = {};
for (const v of enriched) patternCount[v.pattern] = (patternCount[v.pattern]||0)+1;

console.log('Patrones:', patternCount);
console.log('Aux essere:', auxEssere, '/ aux avere:', enriched.length - auxEssere);
console.log('Verbos a verificar:', toVerify.length);

// ───────────────────────────────────────────────────────────────────────────
// 5. Serializar V[] preservando ORDEN de claves + formato legible.
// ───────────────────────────────────────────────────────────────────────────
// Orden canónico de claves para que el diff sea limpio y consistente.
const KEY_ORDER = [
  'n','v','t','b','pattern','aux','pp','ppr','ger','reflexive',
  'pr','im','pc','pr2','fs','co','sb','sbi','ip','ipN',
  'flags','needsSb','warn','verify',
  // _hay se regenera en runtime, lo quitamos de la serialización.
];

function orderedJson(obj) {
  const out = {};
  for (const k of KEY_ORDER) {
    if (obj[k] === undefined) continue;
    out[k] = obj[k];
  }
  // Clave extra inesperada → al final para no perder nada silenciosamente.
  for (const k of Object.keys(obj)) {
    if (k === '_hay') continue;
    if (!(k in out)) out[k] = obj[k];
  }
  return out;
}

let serialized = 'const V = [\n';
enriched.forEach((v, i) => {
  serialized += '  ' + JSON.stringify(orderedJson(v));
  if (i < enriched.length - 1) serialized += ',';
  serialized += '\n';
});
serialized += '];';

// Sustituir en el HTML. vStart apuntaba a "\n" inicial del "const V = [".
// vEnd apuntaba al "\n" ANTES de "];". Para empatar el serialized (que termina
// en "];") con lo que viene detrás, saltamos "\n];" (3 chars) y dejamos que
// empiece el tail en "\n\n// Merge".
const newHtml = html.slice(0, vStart + 1) + serialized + html.slice(vEnd + 3);
writeFileSync(HTML_PATH, newHtml);
console.log('✅ V[] reescrito en verbos.html');

// ───────────────────────────────────────────────────────────────────────────
// 6. Dump de verbos con verify para que el usuario los revise.
// ───────────────────────────────────────────────────────────────────────────
console.log();
console.log('━━━ Verbos marcados para verificar ━━━');
console.log(`Total: ${toVerify.length}`);
if (toVerify.length > 0) {
  for (const v of toVerify) {
    console.log(`  • ${v.v.padEnd(16)} verify=[${v.verify.join(',')}]  pattern=${v.pattern}  tema=${v.b}`);
  }
}

// Y dump de verify como JSON para post-análisis
const verifyPath = join(__dirname, 'data/verify-list.json');
writeFileSync(verifyPath, JSON.stringify(toVerify.map(v => ({
  n: v.n, v: v.v, t: v.t, verify: v.verify, pattern: v.pattern, b: v.b
})), null, 2) + '\n');
console.log(`\nLista completa escrita en ${verifyPath}`);
