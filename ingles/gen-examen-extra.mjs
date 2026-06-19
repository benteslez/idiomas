// Pipeline de los tipos de ejercicio "ricos" del examen Lexis:
//   · gap-fill (rellenar el hueco, estilo Linguaskill)
//   · synonym-in-context (sinónimo de la palabra en una frase)
//   · false friends (falsos amigos para hispanohablantes, con explicación)
// Lee los lotes verificados de /data, valida, deduplica, asigna `b` y escribe
// examen-extra.js (cargado por examen.html).   node gen-examen-extra.mjs
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url);
const read = (p) => JSON.parse(readFileSync(here(p), "utf8"));

const GAP = [...read("./data/src-gap-b2.json"), ...read("./data/src-gap-c1.json"), ...read("./data/src-gap-c2.json")];
const SYN = read("./data/src-syn.json");
const TRAPS = read("./data/src-traps.json");

// --- dificultad logit b (mismo anclaje que el banco principal, §5.2) ---
const LEVELS = ["A2", "B1", "B2", "C1", "C2"];
const B_BASE = { A2: -1.5, B1: -0.5, B2: 0.8, C1: 1.8, C2: 2.7 };
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const cefrToB = (cefr, w) => Math.round((B_BASE[cefr] + (hash(w + cefr) - 0.5) * 0.7) * 100) / 100;

const norm = (s) => String(s).trim();
const lc = (s) => norm(s).toLowerCase();
const uniqOpts = (arr) => new Set(arr.map(lc)).size === arr.length;
const rejected = { gap: 0, syn: 0, trap: 0 };

// --- GAP-FILL ---
const seenGap = new Set(), gap = [];
for (const it of GAP) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase();
  const blank = norm(it.blank), ds = (it.distractors || []).map(norm);
  if (!w || !LEVELS.includes(cefr) || !blank.includes("___") || ds.length < 3) { rejected.gap++; continue; }
  if (ds.some((d) => lc(d) === w) || !uniqOpts(ds)) { rejected.gap++; continue; }
  if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(blank)) { rejected.gap++; continue; } // la respuesta no debe estar en la frase
  if (seenGap.has(w)) continue; seenGap.add(w);
  gap.push({ w, cefr, b: cefrToB(cefr, w), blank, ds, es: norm(it.es), def: norm(it.def_en || "") });
}

// --- SYNONYM-IN-CONTEXT ---
const seenSyn = new Set(), syn = [];
for (const it of SYN) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase();
  const sent = norm(it.sentence), sy = norm(it.syn), ds = (it.distractors || []).map(norm);
  if (!w || !LEVELS.includes(cefr) || !sent || !sy || ds.length < 3) { rejected.syn++; continue; }
  if (!sent.toLowerCase().includes(w)) { rejected.syn++; continue; }            // la palabra debe aparecer en la frase
  if (ds.some((d) => lc(d) === lc(sy)) || !uniqOpts([sy, ...ds])) { rejected.syn++; continue; }
  if (seenSyn.has(w)) continue; seenSyn.add(w);
  syn.push({ w, cefr, b: cefrToB(cefr, w), sent, syn: sy, ds, es: norm(it.es), def: norm(it.def_en || "") });
}

// --- FALSE FRIENDS ---
const seenTrap = new Set(), traps = [];
for (const it of TRAPS) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase();
  const real = norm(it.real), trap = norm(it.trap), d1 = norm(it.d1), d2 = norm(it.d2), note = norm(it.note);
  if (!w || !LEVELS.includes(cefr) || !real || !trap || !d1 || !d2) { rejected.trap++; continue; }
  if (!uniqOpts([real, trap, d1, d2])) { rejected.trap++; continue; }
  if (seenTrap.has(w)) continue; seenTrap.add(w);
  traps.push({ w, cefr, b: cefrToB(cefr, w), real, trap, d1, d2, note });
}

const out =
  "// Ejercicios enriquecidos del examen Lexis — generado por gen-examen-extra.mjs\n" +
  "// gap: rellenar hueco · syn: sinónimo en contexto · traps: falsos amigos.\n" +
  "// NO editar a mano: regenerar con `node gen-examen-extra.mjs`.\n" +
  "window.LEXIS_RICH = " + JSON.stringify({ gap, syn, traps }) + ";\n";
writeFileSync(here("./examen-extra.js"), out, "utf8");

const byLvl = (arr) => LEVELS.map((l) => `${l}:${arr.filter((x) => x.cefr === l).length}`).join(" ");
console.log("=== Ejercicios enriquecidos Lexis ===");
console.log(`gap-fill : ${gap.length}\t(${byLvl(gap)})`);
console.log(`synonym  : ${syn.length}\t(${byLvl(syn)})`);
console.log(`traps    : ${traps.length}\t(${byLvl(traps)})`);
console.log(`TOTAL    : ${gap.length + syn.length + traps.length}`);
console.log("rechazados:", JSON.stringify(rejected));
