// Motor de conjugación italiana — formas SIMPLES por reglas + overrides irregulares.
// No genera tiempos compuestos aquí; esos se derivan al render (aux conjugado + pp
// con concordancia cuando aux === "essere"). Ver buildCompound() abajo.
//
// Nunca inventa formas: si no hay regla ni override, devuelve null y el llamador
// debe marcar verify:true.

// ─────────────────────────────────────────────────────────────────────────────
// Terminaciones regulares por patrón (6 personas excepto donde se indique).
// Fuentes: Treccani, Zanichelli; patrón -isc- cubre finire/capire/preferire…
// Orden personas: io, tu, lui/lei, noi, voi, loro. Imperativo: tu, Lei, noi, voi, Loro.
// ─────────────────────────────────────────────────────────────────────────────
export const END = {
  are: {
    pr:  ['o','i','a','iamo','ate','ano'],
    im:  ['avo','avi','ava','avamo','avate','avano'],
    pr2: ['ai','asti','ò','ammo','aste','arono'],
    fs:  ['erò','erai','erà','eremo','erete','eranno'],
    sb:  ['i','i','i','iamo','iate','ino'],
    sbi: ['assi','assi','asse','assimo','aste','assero'],
    co:  ['erei','eresti','erebbe','eremmo','ereste','erebbero'],
    ip:  ['a','i','iamo','ate','ino'],      // tu, Lei, noi, voi, Loro
    ger: 'ando',
    pp:  'ato',
    ppr: 'ante',
  },
  ere: {
    pr:  ['o','i','e','iamo','ete','ono'],
    im:  ['evo','evi','eva','evamo','evate','evano'],
    pr2: ['ei','esti','é','emmo','este','erono'],
    fs:  ['erò','erai','erà','eremo','erete','eranno'],
    sb:  ['a','a','a','iamo','iate','ano'],
    sbi: ['essi','essi','esse','essimo','este','essero'],
    co:  ['erei','eresti','erebbe','eremmo','ereste','erebbero'],
    ip:  ['i','a','iamo','ete','ano'],
    ger: 'endo',
    pp:  'uto',
    ppr: 'ente',
  },
  ire: {
    pr:  ['o','i','e','iamo','ite','ono'],
    im:  ['ivo','ivi','iva','ivamo','ivate','ivano'],
    pr2: ['ii','isti','ì','immo','iste','irono'],
    fs:  ['irò','irai','irà','iremo','irete','iranno'],
    sb:  ['a','a','a','iamo','iate','ano'],
    sbi: ['issi','issi','isse','issimo','iste','issero'],
    co:  ['irei','iresti','irebbe','iremmo','ireste','irebbero'],
    ip:  ['i','a','iamo','ite','ano'],
    ger: 'endo',
    pp:  'ito',
    ppr: 'ente',
  },
  // -ire con infijo -isc- (finire, capire, preferire, …): -isc solo en
  // 1sg/2sg/3sg y 3pl (indicativo presente, cong. presente, imperativo).
  // El resto SIGUE el patrón -ire normal.
  isc: {
    pr:  ['isco','isci','isce','iamo','ite','iscono'],
    im:  ['ivo','ivi','iva','ivamo','ivate','ivano'],
    pr2: ['ii','isti','ì','immo','iste','irono'],
    fs:  ['irò','irai','irà','iremo','irete','iranno'],
    sb:  ['isca','isca','isca','iamo','iate','iscano'],
    sbi: ['issi','issi','isse','issimo','iste','issero'],
    co:  ['irei','iresti','irebbe','iremmo','ireste','irebbero'],
    ip:  ['isci','isca','iamo','ite','iscano'],
    ger: 'endo',
    pp:  'ito',
    ppr: 'ente',
  },
};

const INF_END_LEN = 3; // "parlare" → stem "parl" (slice -3)
const STEM_LEN = { are: 3, ere: 3, ire: 3, isc: 3 };

/** Devuelve la raíz (stem) del infinitivo quitando -are/-ere/-ire. */
export function stemOf(inf, pattern) {
  return inf.slice(0, -STEM_LEN[pattern]);
}

/** Aplica terminaciones al stem para los 6 personas de un tiempo. */
function apply6(stem, endings) {
  return endings.map(e => stem + e);
}

/** Construye el imperativo (5 personas tu/Lei/noi/voi/Loro) a partir del stem + reglas. */
function buildRegularImperative(stem, endings, infinitive) {
  // Afirmativo: 1 forma por persona.
  const aff = endings.map(e => [stem + e]);
  // Negativo: tu → "non " + infinito; resto = "non " + forma afirmativa.
  const neg = [
    ['non ' + infinitive],
    ['non ' + aff[1][0]],
    ['non ' + aff[2][0]],
    ['non ' + aff[3][0]],
    ['non ' + aff[4][0]],
  ];
  return { aff, neg };
}

/** Construye el imperativo negativo a partir del afirmativo (cuando viene override). */
function buildNegFromAff(affArr, infinitive) {
  // affArr[i] es array de alternativas ["fa'","fai"]. Negativo usa la PRIMERA alternativa.
  return [
    ['non ' + infinitive],
    ['non ' + affArr[1][0]],
    ['non ' + affArr[2][0]],
    ['non ' + affArr[3][0]],
    ['non ' + affArr[4][0]],
  ];
}

/**
 * Conjuga un verbo según su patrón + override opcional.
 *
 * @param {object} verb
 *   - v: infinitivo ("fare")
 *   - pattern: "are" | "ere" | "ire" | "isc"
 *   - override: {pr?, im?, pr2?, fs?, co?, sb?, sbi?, ipN?{aff}, pp?, ppr?, ger?}
 *   - aux: "avere" | "essere" | "entrambi"
 * @returns objeto con todas las formas simples pobladas.
 */
export function conjugate(verb) {
  const { v, pattern, override = {}, aux } = verb;
  if (!END[pattern]) throw new Error(`conjugate: pattern desconocido "${pattern}" para "${v}"`);
  const stem = stemOf(v, pattern);
  const end = END[pattern];

  const out = {
    pr:  override.pr  || apply6(stem, end.pr),
    im:  override.im  || apply6(stem, end.im),
    pr2: override.pr2 || apply6(stem, end.pr2),
    fs:  override.fs  || apply6(stem, end.fs),
    co:  override.co  || apply6(stem, end.co),
    sb:  override.sb  || apply6(stem, end.sb),
    sbi: override.sbi || apply6(stem, end.sbi),
    pp:  override.pp  || (stem + end.pp),
    ppr: override.ppr !== undefined ? override.ppr : (stem + end.ppr),
    ger: override.ger || (stem + end.ger),
    aux,
    ppAgrees: aux === 'essere',
  };

  // Imperativo con 5 personas (afirmativo + negativo derivado).
  if (override.ipN && override.ipN.aff) {
    const aff = override.ipN.aff;
    const neg = override.ipN.neg || buildNegFromAff(aff, v);
    out.ipN = { aff, neg };
  } else {
    out.ipN = buildRegularImperative(stem, end.ip, v);
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Concordancia del participio pasado con "essere".
// Sg: "andato/a"; Pl: "andati/e". Para verbos con pp irregular (fatto, detto,
// stato) la regla es la misma sobre el pp base.
// ─────────────────────────────────────────────────────────────────────────────
export function ppConcord(pp, personIdx) {
  // personIdx: 0=io, 1=tu, 2=lui/lei, 3=noi, 4=voi, 5=loro
  const base = pp.slice(0, -1); // "andato" → "andat"
  const sg = pp + '/a';          // "andato/a"
  const pl = base + 'i/e';       // "andati/e"
  return personIdx < 3 ? sg : pl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción de tiempos COMPUESTOS al render.
// Recibe el verbo conjugado + los dos auxiliares (essere y avere) ya conjugados.
// Aux que uses: "avere" o "essere" (según verb.aux).
// ─────────────────────────────────────────────────────────────────────────────
const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

/** Construye un tiempo compuesto (aux + pp con concordancia si essere). */
export function buildCompound(verb, auxVerb, tenseKeyOfAux) {
  // verb: tiene aux, pp
  // auxVerb: el verbo auxiliar conjugado ({pr, im, pr2, fs, co, sb, sbi, …})
  // tenseKeyOfAux: 'pr' (para passato prossimo) | 'im' (trapassato prossimo) | …
  const auxForms = auxVerb[tenseKeyOfAux];
  if (!auxForms) throw new Error('buildCompound: tense ' + tenseKeyOfAux + ' no en aux');
  const { aux, pp } = verb;
  const aggreges = aux === 'essere';
  return auxForms.map((auxForm, i) => [
    PERSONS[i],
    auxForm + ' ' + (aggreges ? ppConcord(pp, i) : pp)
  ]);
}

/** Mapa de los 7 tiempos compuestos que se generan al render. */
export const COMPOUND_MAP = {
  pc:  'pr',   // passato prossimo       = aux presente       + pp
  tp:  'im',   // trapassato prossimo    = aux imperfetto     + pp
  tr:  'pr2',  // trapassato remoto      = aux passato remoto + pp
  fa:  'fs',   // futuro anteriore       = aux futuro simple  + pp
  cop: 'co',   // condizionale passato   = aux condizionale   + pp
  sbp: 'sb',   // congiuntivo passato    = aux cong. presente + pp
  sbt: 'sbi',  // congiuntivo trapassato = aux cong. imperf   + pp
};

/** Construye TODOS los compuestos de un verbo dados los auxiliares. */
export function buildAllCompounds(verb, auxVerb) {
  const out = {};
  for (const [composite, auxKey] of Object.entries(COMPOUND_MAP)) {
    out[composite] = buildCompound(verb, auxVerb, auxKey);
  }
  // Infinito compuesto: "aver(e) + pp" / "essere + pp"
  const infAux = verb.aux === 'essere' ? 'essere' : 'avere';
  out.infC = verb.aux === 'essere'
    ? 'essere ' + verb.pp + '/a/i/e'
    : 'aver ' + verb.pp;
  // Gerundio compuesto
  out.gerC = verb.aux === 'essere'
    ? 'essendo ' + verb.pp + '/a/i/e'
    : 'avendo ' + verb.pp;
  return out;
}

/**
 * Wrapper: carga los irregulares y devuelve un conjugador listo.
 * Uso típico: en Node, para offline-generate; en el browser usamos conjugate() directo.
 */
export async function createConjugator(irregularsPath) {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(irregularsPath, 'utf8'));
  return function conj(infinitive, defaults = {}) {
    if (data[infinitive]) {
      const meta = data[infinitive];
      // pp/ger/ppr pueden venir al top-level del JSON o dentro de override.
      // Normalizamos: el override "definitivo" combina ambos. Top-level gana
      // sobre override si ambos estuvieran (no ocurre en práctica).
      const o = { ...(meta.override || {}) };
      if (meta.pp  !== undefined && o.pp  === undefined) o.pp  = meta.pp;
      if (meta.ger !== undefined && o.ger === undefined) o.ger = meta.ger;
      if (meta.ppr !== undefined && o.ppr === undefined) o.ppr = meta.ppr;
      return conjugate({
        v: infinitive,
        pattern: meta.pattern,
        override: o,
        aux: meta.aux,
      });
    }
    // Regular: necesita pattern + aux explícitos
    if (!defaults.pattern) throw new Error(`conj: ${infinitive} no es irregular conocido y no se pasó pattern`);
    return conjugate({
      v: infinitive,
      pattern: defaults.pattern,
      aux: defaults.aux || 'avere',
    });
  };
}
