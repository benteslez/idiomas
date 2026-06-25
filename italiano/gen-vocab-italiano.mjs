#!/usr/bin/env node
// Genera el dataset DATA[] del Vocabulario italiano a partir del banco léxico del
// examen Lexis IT (examen-data.js / examen-extra.js / examen-phrasal.js).
// Salida: vocab-italiano.json  (array de tarjetas con el esquema de vocabulario.html)
//
// Enriquecimiento determinista:
//   - género: del artículo italiano; si ambiguo (l'/un'), del artículo español
//   - categoría: Nombre / Verbo / Adjetivo / Adverbio / Expresion (heurística)
//   - ejemplo (ex_it): reutilizado de gap/syn/phrasal cuando existe
//   - sinónimo (syn): de LEXIS_RICH.syn
//   - falsi amici (warn): de LEXIS_RICH.traps  -> tema "Falsos amigos"
//   - tema: heurística por palabras clave sobre la taxonomía (español) ya existente
// Los ejemplos bilingües de calidad (ex_es + ex_it pulido) se completan después.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (f) => readFileSync(join(__dirname, f), 'utf8');

// --- cargar las fuentes (definen window.LEXIS_*) ---
const sandbox = { window: {} };
const run = (code) => new Function('window', code)(sandbox.window);
run(load('examen-data.js'));
run(load('examen-extra.js'));
run(load('examen-phrasal.js'));

const ITEMS   = sandbox.window.LEXIS_ITEMS   || [];   // [parola, es, cefr, b]
const RICH    = sandbox.window.LEXIS_RICH    || {};   // {gap, syn, traps}
const PHRASAL = sandbox.window.LEXIS_PHRASAL || [];   // [{pv, cefr, b, es, sent, def}]

// ---------- helpers léxicos ----------
const ARTS_M = new Set(['il', 'lo', 'i', 'gli', 'un', 'uno']);
const ARTS_F = new Set(['la', 'le', 'una']);
const ALL_ARTS = new Set([...ARTS_M, ...ARTS_F, "l'", "un'", 'gli', 'degli', 'dei', 'delle']);

function splitArticle(w) {
  // separa el artículo italiano inicial; devuelve [art|null, resto]
  const apos = w.match(/^(l'|un')\s?/i);
  if (apos) return [apos[1].toLowerCase(), w.slice(apos[0].length)];
  const m = w.match(/^([A-Za-zàèéìíîòóùú]+)\s+(.+)$/);
  if (m && ALL_ARTS.has(m[1].toLowerCase())) return [m[1].toLowerCase(), m[2]];
  return [null, w];
}

function esArticleGender(es) {
  const t = es.trim().toLowerCase();
  if (/^(el|los|un)\s/.test(t)) return 'm';
  if (/^(la|las|una)\s/.test(t)) return 'f';
  return null;
}

function detectGender(w, es) {
  const [art, rest] = splitArticle(w);
  if (art) {
    if (ARTS_M.has(art)) return 'm';
    if (ARTS_F.has(art)) return 'f';
    // l' / un' -> usar terminación, luego español
    const last = rest.slice(-1);
    if (last === 'o') return 'm';
    if (last === 'a') return 'f';
    return esArticleGender(es); // puede ser null
  }
  return null; // sin artículo: verbo/adjetivo/adverbio -> sin género
}

const VERB_END = /(are|ere|ire|rre|arsi|ersi|irsi|si)$/;
function detectCat(w, es, isExpr) {
  if (isExpr) return 'Expresion';
  const [art, rest] = splitArticle(w);
  if (art) return 'Nombre';
  const word = w.trim();
  if (/\s/.test(word) && word.split(/\s+/).length >= 3) return 'Expresion';
  if (word.endsWith('mente')) return 'Adverbio';
  const esFirst = (es.split(/[\/,]/)[0] || '').trim().toLowerCase();
  const esIsVerb = /(ar|er|ir|arse|erse|irse)$/.test(esFirst) && esFirst.length > 3;
  if (VERB_END.test(word) && (esIsVerb || word.length > 4)) return 'Verbo';
  if (esIsVerb) return 'Verbo';
  return 'Adjetivo';
}

// ---------- temas (taxonomía española ya existente en el motor) ----------
const TOPIC_KW = {
  'Medio ambiente': ['ambient','inquin', 'rifiut','riciclo','clima','ecolog','energia','sostenib','natura','foresta','mare','animale','pianeta','rinnovab','contamin','plastica','specie'],
  'Salud': ['salute','malatt','medic','ospedale','dolore','cura','farmac','sintomo','virus','corpo','sano','infermi','dottore','ferita','curare','guarire','terapia','dieta'],
  'Trabajo': ['lavoro','lavorare','ufficio','impieg','azienda','dipendent','stipendio','contratto','collega','carriera','licenzia','assum','riunione','capo','disoccup','sciopero','mestiere','professione'],
  'Alimentación': ['cibo','mangiare','cucina','ristorante','piatto','frutta','verdura','carne','pesce','formaggio','pane','vino','dolce','ricetta','sapore','bere','colazione','pranzo','cena','pasto'],
  'Educación': ['scuola','studi','università','imparare','insegn','student','professore','esame','lezione','libro','laurea','corso','aula','compito','voto','materia'],
  'Transporte': ['treno','auto','macchina','autobus','aereo','viaggio','strada','guida','bicicletta','metro','traffico','patente','volo','stazione','binario','biglietto'],
  'Tecnologia': ['computer','tecnolog','internet','telefono','digital','software','rete','sito','dati','schermo','app','online','informatic','elettronic','robot','intelligenza'],
  'Cultura y ocio': ['musica','cinema','film','arte','teatro','libro','museo','concerto','spettacolo','festa','hobby','divertir','lettura','quadro','cantante','attore','tempo libero'],
  'Viajes': ['viagg','vacanza','hotel','albergo','turist','valigia','spiaggia','mare','montagna','partire','meta','prenota','soggiorno','escursione'],
  'Sociedad': ['società','social','gente','comunità','cittadino','popolo','cultura','generazione','problema','vita','mondo','persone','gruppo'],
  'Vivienda': ['casa','appartament','abita','stanza','camera','cucina','arred','affitto','mobili','muro','porta','finestra','tetto','giardino','quartiere'],
  'Familia': ['famiglia','madre','padre','figlio','figlia','fratello','sorella','genitor','nonno','nonna','marito','moglie','parente','zio','zia','cugino','bambino'],
  'Dinero y compras': ['soldi','denaro','prezzo','compra','negozio','spesa','banca','pagare','costo','euro','risparmi','vendita','sconto','mercato','cliente'],
  'Medios de comunicación': ['giornale','notizia','televisione','radio','stampa','giornalista','media','pubblicità','intervista','programma','telegiornale'],
  'Sentimientos': ['amore','felic','triste','paura','rabbia','emozione','sentiment','gioia','dolore','ansia','contento','arrabbi','piacere','odiare','amare'],
  'Personalidad': ['carattere','timido','gentile','simpatico','onesto','generoso','egoist','orgoglios','pigro','testardo','allegro','serio','educato'],
  'Tiempo y clima': ['tempo','pioggia','sole','neve','vento','caldo','freddo','nuvola','temperatura','stagione','estate','inverno','autunno','primavera','meteo','nebbia'],
  'Cuerpo y descripción': ['testa','mano','braccio','gamba','occhio','capelli','viso','bocca','piede','schiena','corpo','dito','naso','orecchio','alto','basso','magro','grasso'],
  'Política y ciudadanía': ['govern','politic','stato','legge','elezione','president','ministro','parlamento','democra','diritto','partito','voto','cittadin','nazione'],
  'Justicia y delitos': ['legge','reato','crimine','rubare','furto','polizia','carcere','process','giudice','avvocato','tribunale','prigione','colpevole','condanna'],
  'Ciencia e investigación': ['scienza','ricerca','esperiment','scoperta','teoria','laboratorio','scienziato','studio','analisi','fisica','chimica','biologia'],
  'Ciudad y urbanismo': ['città','strada','piazza','edificio','quartiere','centro','parco','urban','marciapiede','semaforo','palazzo','periferia'],
  'Ropa y estilo': ['vestit','abito','scarpe','moda','indoss','camicia','pantaloni','gonna','cappotto','maglia','stile','cravatta','borsa'],
  'Deportes y actividad física': ['sport','calcio','partita','squadra','allena','corsa','correre','palestra','gioco','nuoto','tennis','atleta','vincere','campione'],
  'Inmigración e interculturalidad': ['immigr','straniero','frontiera','integra','migrante','rifugiat','razza','etnia','divers'],
  'Igualdad y discriminación': ['uguaglianza','discrimin','parità','gender','femmin','maschil','razzism','disabil'],
};
const TOPIC_ORDER = Object.keys(TOPIC_KW);

function detectTema(w, es, def) {
  const hay = (w + ' ' + es + ' ' + (def || '')).toLowerCase();
  for (const tema of TOPIC_ORDER) {
    for (const kw of TOPIC_KW[tema]) {
      if (hay.includes(kw)) return tema;
    }
  }
  return null; // se asigna bucket general luego
}

// ---------- indexar datos ricos ----------
const richByWord = {};
(RICH.gap || []).forEach((g) => { richByWord[g.w] = { ex: g.blank ? g.blank.replace(/_{2,}/, g.w) : null, def: g.def }; });
(RICH.syn || []).forEach((s) => { richByWord[s.w] = Object.assign(richByWord[s.w] || {}, { ex: s.sent || (richByWord[s.w] || {}).ex, syn: s.syn, def: s.def }); });

const trapByWord = {};
(RICH.traps || []).forEach((t) => { trapByWord[t.w] = t; });

// ---------- construir tarjetas ----------
const cards = [];
const seen = new Set();
let id = 0;

function topFromLevel(nivel) { return nivel === 'A1' || nivel === 'A2' || nivel === 'B1'; }

// 1) términos base (LEXIS_ITEMS) — dedup por palabra
for (const [w, es, cefr] of ITEMS) {
  if (seen.has(w)) continue;
  seen.add(w);
  id++;
  const trap = trapByWord[w];
  const rich = richByWord[w] || {};
  let tema, warn = null, syn = rich.syn || null, t = es, ex_it = rich.ex || '';
  if (trap) {
    tema = 'Falsos amigos';
    warn = trap.note || null;
    t = trap.real || es;
    ex_it = ex_it || '';
  } else {
    tema = detectTema(w, es, rich.def);
  }
  const cat = detectCat(w, es, false);
  const gen = cat === 'Nombre' ? detectGender(w, es) : null;
  cards.push({
    id, w, t, tema: tema || '__GEN__', cat, gen,
    ex_it, ex_es: '',
    syn, warn,
    flags: { top: topFromLevel(cefr) },
    fn: null, reg: null, constr: null,
    nivel: cefr,
    _def: rich.def || (trap ? null : null), // pista interna para el enriquecedor
  });
}

// 2) traps que no estaban en ITEMS
for (const tr of (RICH.traps || [])) {
  if (seen.has(tr.w)) continue;
  seen.add(tr.w);
  id++;
  cards.push({
    id, w: tr.w, t: tr.real, tema: 'Falsos amigos',
    cat: detectCat(tr.w, tr.real, false),
    gen: null, ex_it: '', ex_es: '', syn: null, warn: tr.note || null,
    flags: { top: topFromLevel(tr.cefr) }, fn: null, reg: null, constr: null,
    nivel: tr.cefr, _def: null,
  });
}
// arreglar género de las traps que sean nombres
for (const c of cards) { if (c.tema === 'Falsos amigos' && c.cat === 'Nombre' && !c.gen) c.gen = detectGender(c.w, c.t); }

// 3) expresiones / modismos (PHRASAL)
for (const p of PHRASAL) {
  if (seen.has(p.pv)) continue;
  seen.add(p.pv);
  id++;
  cards.push({
    id, w: p.pv, t: p.es, tema: 'Expresiones',
    cat: 'Expresion', gen: null,
    ex_it: p.sent || '', ex_es: '', syn: null, warn: null,
    flags: { top: topFromLevel(p.cefr) }, fn: null, reg: null, constr: null,
    nivel: p.cefr, _def: p.def || null,
  });
}

// bucket general para los sin tema -> "Sociedad" como fallback temático genérico amplio
for (const c of cards) { if (c.tema === '__GEN__') c.tema = 'General'; }

// ---------- estadísticas ----------
const byTema = {};
const byCat = {};
const byNivel = {};
let withEx = 0, withGen = 0, withWarn = 0;
for (const c of cards) {
  byTema[c.tema] = (byTema[c.tema] || 0) + 1;
  byCat[c.cat] = (byCat[c.cat] || 0) + 1;
  byNivel[c.nivel] = (byNivel[c.nivel] || 0) + 1;
  if (c.ex_it) withEx++;
  if (c.gen) withGen++;
  if (c.warn) withWarn++;
}

// salida limpia para inyectar: renombra ex_it -> ex_fr (clave que usa el motor) y quita pistas internas
const clean = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, tema: c.tema, cat: c.cat, gen: c.gen,
  ex_fr: c.ex_it || '', ex_es: c.ex_es || '',
  syn: c.syn, warn: c.warn, flags: c.flags,
  fn: c.fn, reg: c.reg, constr: c.constr, nivel: c.nivel,
}));
// entrada para el enriquecedor (temas + ejemplos bilingües)
const enrich = cards.map((c) => ({
  id: c.id, w: c.w, t: c.t, cat: c.cat, nivel: c.nivel,
  tema: c.tema, hasEx: !!c.ex_it, def: c._def || null, isTrap: c.tema === 'Falsos amigos',
}));

writeFileSync(join(__dirname, 'vocab-italiano.json'), JSON.stringify(clean, null, 2));
writeFileSync(join(__dirname, 'vocab-enrich-input.json'), JSON.stringify(enrich));
console.log('TOTAL tarjetas:', cards.length);
console.log('con ejemplo IT:', withEx, '| con género:', withGen, '| con warn (falsi amici):', withWarn);
console.log('por nivel:', JSON.stringify(byNivel));
console.log('por categoría:', JSON.stringify(byCat));
console.log('por tema:'); Object.entries(byTema).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ', v.toString().padStart(4), k));
