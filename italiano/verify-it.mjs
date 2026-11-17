#!/usr/bin/env node
// Validador del motor de conjugación italiana.
// Compara la salida de conj-it.mjs contra tablas de referencia hardcodeadas,
// extraídas del prompt del usuario (FARE + essere, avere, andare, dire, venire,
// stare, dare, bere) y de la bibliografía estándar para los regulares de cada
// conjugación (parlare, credere, sentire, finire).
//
// Cualquier discrepancia aborta con exit code 1 y pinta el diff.

import { createConjugator, buildCompound } from './conj-it.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const conj = await createConjugator(join(__dirname, 'data/irregulars-it.json'));

// ─────────────────────────────────────────────────────────────────────────────
// Tablas de referencia. Cada clave de tiempo = las 6 (o 5 en ipN) formas.
// ─────────────────────────────────────────────────────────────────────────────
const REF = {
  // 9 irregulares explícitos del prompt
  fare: {
    aux: 'avere',
    pr:  ['faccio','fai','fa','facciamo','fate','fanno'],
    im:  ['facevo','facevi','faceva','facevamo','facevate','facevano'],
    pr2: ['feci','facesti','fece','facemmo','faceste','fecero'],
    fs:  ['farò','farai','farà','faremo','farete','faranno'],
    sb:  ['faccia','faccia','faccia','facciamo','facciate','facciano'],
    sbi: ['facessi','facessi','facesse','facessimo','faceste','facessero'],
    co:  ['farei','faresti','farebbe','faremmo','fareste','farebbero'],
    ipAff: [['fa',"'"],['faccia'],['facciamo'],['fate'],['facciano']],  // placeholder, reemplazo abajo
    ger: 'facendo',
    ppr: 'facente',
    pp:  'fatto',
  },
  essere: {
    aux: 'essere',
    pr:  ['sono','sei','è','siamo','siete','sono'],
    im:  ['ero','eri','era','eravamo','eravate','erano'],
    pr2: ['fui','fosti','fu','fummo','foste','furono'],
    fs:  ['sarò','sarai','sarà','saremo','sarete','saranno'],
    sb:  ['sia','sia','sia','siamo','siate','siano'],
    sbi: ['fossi','fossi','fosse','fossimo','foste','fossero'],
    co:  ['sarei','saresti','sarebbe','saremmo','sareste','sarebbero'],
    ger: 'essendo',
    pp:  'stato',
  },
  avere: {
    aux: 'avere',
    pr:  ['ho','hai','ha','abbiamo','avete','hanno'],
    im:  ['avevo','avevi','aveva','avevamo','avevate','avevano'],
    pr2: ['ebbi','avesti','ebbe','avemmo','aveste','ebbero'],
    fs:  ['avrò','avrai','avrà','avremo','avrete','avranno'],
    sb:  ['abbia','abbia','abbia','abbiamo','abbiate','abbiano'],
    sbi: ['avessi','avessi','avesse','avessimo','aveste','avessero'],
    co:  ['avrei','avresti','avrebbe','avremmo','avreste','avrebbero'],
    ger: 'avendo',
    pp:  'avuto',
  },
  andare: {
    aux: 'essere',
    pr:  ['vado','vai','va','andiamo','andate','vanno'],
    im:  ['andavo','andavi','andava','andavamo','andavate','andavano'],
    pr2: ['andai','andasti','andò','andammo','andaste','andarono'],
    fs:  ['andrò','andrai','andrà','andremo','andrete','andranno'],
    sb:  ['vada','vada','vada','andiamo','andiate','vadano'],
    sbi: ['andassi','andassi','andasse','andassimo','andaste','andassero'],
    co:  ['andrei','andresti','andrebbe','andremmo','andreste','andrebbero'],
    ger: 'andando',
    pp:  'andato',
  },
  dire: {
    aux: 'avere',
    pr:  ['dico','dici','dice','diciamo','dite','dicono'],
    im:  ['dicevo','dicevi','diceva','dicevamo','dicevate','dicevano'],
    pr2: ['dissi','dicesti','disse','dicemmo','diceste','dissero'],
    fs:  ['dirò','dirai','dirà','diremo','direte','diranno'],
    sb:  ['dica','dica','dica','diciamo','diciate','dicano'],
    sbi: ['dicessi','dicessi','dicesse','dicessimo','diceste','dicessero'],
    co:  ['direi','diresti','direbbe','diremmo','direste','direbbero'],
    ger: 'dicendo',
    pp:  'detto',
  },
  venire: {
    aux: 'essere',
    pr:  ['vengo','vieni','viene','veniamo','venite','vengono'],
    im:  ['venivo','venivi','veniva','venivamo','venivate','venivano'],
    pr2: ['venni','venisti','venne','venimmo','veniste','vennero'],
    fs:  ['verrò','verrai','verrà','verremo','verrete','verranno'],
    sb:  ['venga','venga','venga','veniamo','veniate','vengano'],
    sbi: ['venissi','venissi','venisse','venissimo','veniste','venissero'],
    co:  ['verrei','verresti','verrebbe','verremmo','verreste','verrebbero'],
    ger: 'venendo',
    pp:  'venuto',
  },
  stare: {
    aux: 'essere',
    pr:  ['sto','stai','sta','stiamo','state','stanno'],
    im:  ['stavo','stavi','stava','stavamo','stavate','stavano'],
    pr2: ['stetti','stesti','stette','stemmo','steste','stettero'],
    fs:  ['starò','starai','starà','staremo','starete','staranno'],
    sb:  ['stia','stia','stia','stiamo','stiate','stiano'],
    sbi: ['stessi','stessi','stesse','stessimo','steste','stessero'],
    co:  ['starei','staresti','starebbe','staremmo','stareste','starebbero'],
    ger: 'stando',
    pp:  'stato',
  },
  dare: {
    aux: 'avere',
    pr:  ['do','dai','dà','diamo','date','danno'],
    im:  ['davo','davi','dava','davamo','davate','davano'],
    pr2: ['diedi','desti','diede','demmo','deste','diedero'],
    fs:  ['darò','darai','darà','daremo','darete','daranno'],
    sb:  ['dia','dia','dia','diamo','diate','diano'],
    sbi: ['dessi','dessi','desse','dessimo','deste','dessero'],
    co:  ['darei','daresti','darebbe','daremmo','dareste','darebbero'],
    ger: 'dando',
    pp:  'dato',
  },
  bere: {
    aux: 'avere',
    pr:  ['bevo','bevi','beve','beviamo','bevete','bevono'],
    im:  ['bevevo','bevevi','beveva','bevevamo','bevevate','bevevano'],
    pr2: ['bevvi','bevesti','bevve','bevemmo','beveste','bevvero'],
    fs:  ['berrò','berrai','berrà','berremo','berrete','berranno'],
    sb:  ['beva','beva','beva','beviamo','beviate','bevano'],
    sbi: ['bevessi','bevessi','bevesse','bevessimo','beveste','bevessero'],
    co:  ['berrei','berresti','berrebbe','berremmo','berreste','berrebbero'],
    ger: 'bevendo',
    pp:  'bevuto',
  },
  // 4 regulares (uno por patrón)
  parlare: {
    aux: 'avere',
    pattern: 'are',
    pr:  ['parlo','parli','parla','parliamo','parlate','parlano'],
    im:  ['parlavo','parlavi','parlava','parlavamo','parlavate','parlavano'],
    pr2: ['parlai','parlasti','parlò','parlammo','parlaste','parlarono'],
    fs:  ['parlerò','parlerai','parlerà','parleremo','parlerete','parleranno'],
    sb:  ['parli','parli','parli','parliamo','parliate','parlino'],
    sbi: ['parlassi','parlassi','parlasse','parlassimo','parlaste','parlassero'],
    co:  ['parlerei','parleresti','parlerebbe','parleremmo','parlereste','parlerebbero'],
    ger: 'parlando',
    pp:  'parlato',
  },
  credere: {
    aux: 'avere',
    pattern: 'ere',
    pr:  ['credo','credi','crede','crediamo','credete','credono'],
    im:  ['credevo','credevi','credeva','credevamo','credevate','credevano'],
    pr2: ['credei','credesti','credé','credemmo','credeste','crederono'],
    fs:  ['crederò','crederai','crederà','crederemo','crederete','crederanno'],
    sb:  ['creda','creda','creda','crediamo','crediate','credano'],
    sbi: ['credessi','credessi','credesse','credessimo','credeste','credessero'],
    co:  ['crederei','crederesti','crederebbe','crederemmo','credereste','crederebbero'],
    ger: 'credendo',
    pp:  'creduto',
  },
  sentire: {
    aux: 'avere',
    pattern: 'ire',
    pr:  ['sento','senti','sente','sentiamo','sentite','sentono'],
    im:  ['sentivo','sentivi','sentiva','sentivamo','sentivate','sentivano'],
    pr2: ['sentii','sentisti','sentì','sentimmo','sentiste','sentirono'],
    fs:  ['sentirò','sentirai','sentirà','sentiremo','sentirete','sentiranno'],
    sb:  ['senta','senta','senta','sentiamo','sentiate','sentano'],
    sbi: ['sentissi','sentissi','sentisse','sentissimo','sentiste','sentissero'],
    co:  ['sentirei','sentiresti','sentirebbe','sentiremmo','sentireste','sentirebbero'],
    ger: 'sentendo',
    pp:  'sentito',
  },
  finire: {
    aux: 'avere',
    pattern: 'isc',
    pr:  ['finisco','finisci','finisce','finiamo','finite','finiscono'],
    im:  ['finivo','finivi','finiva','finivamo','finivate','finivano'],
    pr2: ['finii','finisti','finì','finimmo','finiste','finirono'],
    fs:  ['finirò','finirai','finirà','finiremo','finirete','finiranno'],
    sb:  ['finisca','finisca','finisca','finiamo','finiate','finiscano'],
    sbi: ['finissi','finissi','finisse','finissimo','finiste','finissero'],
    co:  ['finirei','finiresti','finirebbe','finiremmo','finireste','finirebbero'],
    ger: 'finendo',
    pp:  'finito',
  },
};

// Imperativos de referencia (todos los irregulares del prompt)
const REF_IMP = {
  fare: {
    aff: [["fa'","fai"],['faccia'],['facciamo'],['fate'],['facciano']],
    neg: [['non fare'],['non faccia'],['non facciamo'],['non fate'],['non facciano']],
  },
  essere: {
    aff: [['sii'],['sia'],['siamo'],['siate'],['siano']],
    neg: [['non essere'],['non sia'],['non siamo'],['non siate'],['non siano']],
  },
  avere: {
    aff: [['abbi'],['abbia'],['abbiamo'],['abbiate'],['abbiano']],
    neg: [['non avere'],['non abbia'],['non abbiamo'],['non abbiate'],['non abbiano']],
  },
  andare: {
    aff: [["va'","vai"],['vada'],['andiamo'],['andate'],['vadano']],
    neg: [['non andare'],['non vada'],['non andiamo'],['non andate'],['non vadano']],
  },
  dire: {
    aff: [["di'","dì"],['dica'],['diciamo'],['dite'],['dicano']],
    neg: [['non dire'],['non dica'],['non diciamo'],['non dite'],['non dicano']],
  },
  venire: {
    aff: [['vieni'],['venga'],['veniamo'],['venite'],['vengano']],
    neg: [['non venire'],['non venga'],['non veniamo'],['non venite'],['non vengano']],
  },
  stare: {
    aff: [["sta'","stai"],['stia'],['stiamo'],['state'],['stiano']],
    neg: [['non stare'],['non stia'],['non stiamo'],['non state'],['non stiano']],
  },
  dare: {
    aff: [["da'","dai"],['dia'],['diamo'],['date'],['diano']],
    neg: [['non dare'],['non dia'],['non diamo'],['non date'],['non diano']],
  },
  bere: {
    aff: [['bevi'],['beva'],['beviamo'],['bevete'],['bevano']],
    neg: [['non bere'],['non beva'],['non beviamo'],['non bevete'],['non bevano']],
  },
  // Regulares: generados automáticamente
  parlare: {
    aff: [['parla'],['parli'],['parliamo'],['parlate'],['parlino']],
    neg: [['non parlare'],['non parli'],['non parliamo'],['non parlate'],['non parlino']],
  },
  credere: {
    aff: [['credi'],['creda'],['crediamo'],['credete'],['credano']],
    neg: [['non credere'],['non creda'],['non crediamo'],['non credete'],['non credano']],
  },
  sentire: {
    aff: [['senti'],['senta'],['sentiamo'],['sentite'],['sentano']],
    neg: [['non sentire'],['non senta'],['non sentiamo'],['non sentite'],['non sentano']],
  },
  finire: {
    aff: [['finisci'],['finisca'],['finiamo'],['finite'],['finiscano']],
    neg: [['non finire'],['non finisca'],['non finiamo'],['non finite'],['non finiscano']],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
function arrEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
      if (!arrEq(a[i], b[i])) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function diff(label, got, want) {
  if (arrEq(got, want)) return null;
  return `  ✗ ${label}\n     esperado: ${JSON.stringify(want)}\n     obtenido: ${JSON.stringify(got)}`;
}

let totalFail = 0;
const SIMPLE_KEYS = ['pr','im','pr2','fs','sb','sbi','co'];
const SCALAR_KEYS = ['ger','pp','ppr'];

for (const [v, ref] of Object.entries(REF)) {
  const got = conj(v, { pattern: ref.pattern, aux: ref.aux });
  const fails = [];

  for (const k of SIMPLE_KEYS) {
    if (!ref[k]) continue;
    const d = diff(`${v}.${k}`, got[k], ref[k]);
    if (d) fails.push(d);
  }
  for (const k of SCALAR_KEYS) {
    if (!ref[k]) continue;
    if (got[k] !== ref[k]) fails.push(`  ✗ ${v}.${k}\n     esperado: ${ref[k]}\n     obtenido: ${got[k]}`);
  }
  if (ref.aux && got.aux !== ref.aux) fails.push(`  ✗ ${v}.aux\n     esperado: ${ref.aux}\n     obtenido: ${got.aux}`);

  // Imperativo (5 personas, cada celda array de alternativas)
  const refImp = REF_IMP[v];
  if (refImp) {
    const d1 = diff(`${v}.ipN.aff`, got.ipN && got.ipN.aff, refImp.aff);
    if (d1) fails.push(d1);
    const d2 = diff(`${v}.ipN.neg`, got.ipN && got.ipN.neg, refImp.neg);
    if (d2) fails.push(d2);
  }

  if (fails.length) {
    console.log(`\n✗ ${v}`);
    for (const f of fails) console.log(f);
    totalFail += fails.length;
  } else {
    console.log(`✓ ${v}`);
  }
}

// Verificación extra del prompt: trapassato remoto de fare
const fareConj  = conj('fare');
const avereConj = conj('avere');
const trFare = buildCompound({aux:'avere', pp:'fatto'}, avereConj, 'pr2');
const trFareWant = [
  ['io','ebbi fatto'],
  ['tu','avesti fatto'],
  ['lui/lei','ebbe fatto'],
  ['noi','avemmo fatto'],
  ['voi','aveste fatto'],
  ['loro','ebbero fatto'],
];
if (!arrEq(trFare, trFareWant)) {
  console.log('\n✗ fare.trapassato_remoto (compuesto)');
  console.log('   esperado:', JSON.stringify(trFareWant));
  console.log('   obtenido:', JSON.stringify(trFare));
  totalFail++;
} else {
  console.log('✓ fare.trapassato_remoto (compuesto)');
}

console.log();
if (totalFail === 0) {
  console.log(`✅ Todos los tests pasaron (${Object.keys(REF).length} verbos simples + 1 compuesto).`);
  process.exit(0);
} else {
  console.log(`❌ ${totalFail} fallos.`);
  process.exit(1);
}
