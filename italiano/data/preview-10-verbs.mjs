#!/usr/bin/env node
// Genera un volcado JSON de 10+ verbos totalmente conjugados con el motor
// (los 9 irregulares de referencia + los 4 regulares de referencia).
// Para verificación visual antes de ampliar a los 149 verbos del corpus.

import { createConjugator, buildAllCompounds } from '../conj-it.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const conj = await createConjugator(join(__dirname, 'irregulars-it.json'));

const VERBS = [
  { v: 'essere',  pattern: 'ere', aux: 'essere' },
  { v: 'avere',   pattern: 'ere', aux: 'avere'  },
  { v: 'fare',    pattern: 'are', aux: 'avere'  },
  { v: 'andare',  pattern: 'are', aux: 'essere' },
  { v: 'dire',    pattern: 'ere', aux: 'avere'  },
  { v: 'venire',  pattern: 'ire', aux: 'essere' },
  { v: 'stare',   pattern: 'are', aux: 'essere' },
  { v: 'dare',    pattern: 'are', aux: 'avere'  },
  { v: 'bere',    pattern: 'ere', aux: 'avere'  },
  { v: 'parlare', pattern: 'are', aux: 'avere'  },
  { v: 'credere', pattern: 'ere', aux: 'avere'  },
  { v: 'sentire', pattern: 'ire', aux: 'avere'  },
  { v: 'finire',  pattern: 'isc', aux: 'avere'  },
];

const essereC = conj('essere');
const avereC  = conj('avere');

const out = {};
for (const info of VERBS) {
  const simple = conj(info.v, { pattern: info.pattern, aux: info.aux });
  const auxVerb = simple.aux === 'essere' ? essereC : avereC;
  const compounds = buildAllCompounds(simple, auxVerb);

  out[info.v] = {
    aux: simple.aux,
    pp: simple.pp,
    ppr: simple.ppr,
    ger: simple.ger,
    // Formas no personales
    infinitives: { simple: info.v, compound: compounds.infC },
    gerunds:     { simple: simple.ger, compound: compounds.gerC },
    participles: { presente: simple.ppr, passato: simple.pp },
    // Indicativo (simple | compuesto)
    indicativo: {
      presente:         { simple: simple.pr,  compound: compounds.pc },
      imperfetto:       { simple: simple.im,  compound: compounds.tp },
      passatoRemoto:    { simple: simple.pr2, compound: compounds.tr },
      futuroSemplice:   { simple: simple.fs,  compound: compounds.fa },
    },
    // Congiuntivo
    congiuntivo: {
      presente:   { simple: simple.sb,  compound: compounds.sbp },
      imperfetto: { simple: simple.sbi, compound: compounds.sbt },
    },
    // Condizionale
    condizionale: {
      presente: { simple: simple.co, compound: compounds.cop },
    },
    // Imperativo (5 personas tu/Lei/noi/voi/Loro, afirmativo + negativo)
    imperativo: simple.ipN,
  };
}

const outPath = join(__dirname, 'preview-10-verbs.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`✅ Escrito ${outPath} con ${VERBS.length} verbos.`);
console.log('Verbos:', VERBS.map(v=>v.v).join(', '));
