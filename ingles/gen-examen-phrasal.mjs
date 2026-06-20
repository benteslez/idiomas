// Pipeline del tema "phrasal verbs" del examen Lexis.
// Combina los lotes A2–C2, valida, deduplica por phrasal verb, asigna `b` y
// escribe examen-phrasal.js (window.LEXIS_PHRASAL). node gen-examen-phrasal.mjs
import { readFileSync, writeFileSync } from "node:fs";
const here = (p) => new URL(p, import.meta.url);
const read = (p) => JSON.parse(readFileSync(here(p), "utf8"));

const SRC = [
  ...read("./data/src-pv-a2b1.json"),
  ...read("./data/src-pv-b1b2.json"),
  ...read("./data/src-pv-b2c1.json"),
  ...read("./data/src-pv-c1c2.json"),
];

const LEVELS = ["A2", "B1", "B2", "C1", "C2"];
const B_BASE = { A2: -1.5, B1: -0.5, B2: 0.8, C1: 1.8, C2: 2.7 };
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const cefrToB = (cefr, w) => Math.round((B_BASE[cefr] + (hash(w + cefr) - 0.5) * 0.7) * 100) / 100;
const norm = (s) => String(s).trim();
const lc = (s) => norm(s).toLowerCase();

const seen = new Set(), out = [];
let rejected = 0;
for (const it of SRC) {
  const pv = lc(it.pv), cefr = norm(it.cefr).toUpperCase();
  const es = norm(it.es), sent = norm(it.sentence), ds = (it.distractors || []).map(lc);
  if (!pv || !LEVELS.includes(cefr) || !es || ds.length < 3) { rejected++; continue; }
  if (!sent.toLowerCase().includes(pv)) { rejected++; continue; }     // la frase debe contener el phrasal verb
  if (ds.some(d => d === pv) || new Set(ds).size < 3) { rejected++; continue; }
  if (seen.has(pv)) continue; seen.add(pv);
  out.push({ pv, cefr, b: cefrToB(cefr, pv), es, sent, ds, def: norm(it.def_en || "") });
}
out.sort((a, b) => a.b - b.b);

const js =
  "// Tema 'phrasal verbs' del examen Lexis — generado por gen-examen-phrasal.mjs\n" +
  "// Cada ítem: {pv, cefr, b, es, sent, ds:[distractores pv], def}\n" +
  "window.LEXIS_PHRASAL = " + JSON.stringify(out) + ";\n";
writeFileSync(here("./examen-phrasal.js"), js, "utf8");

const byLvl = LEVELS.map(l => `${l}:${out.filter(x => x.cefr === l).length}`).join(" ");
console.log("=== Tema phrasal verbs ===");
console.log("Total únicos:", out.length, "|", byLvl);
console.log("Rechazados/duplicados:", rejected);
