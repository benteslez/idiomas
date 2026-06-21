// Pipeline de los ejercicios "con frase" del examen Lexis IT:
//   gap-fill · sinónimo en contexto · falsi amici.
// Lee data/src-gap.json, data/src-syn.json y data/src-faux.json, valida,
// deduplica, asigna b y escribe examen-extra.js (window.LEXIS_RICH).
//   node gen-examen-extra.mjs
import { readFileSync, writeFileSync } from "node:fs";
const here = (p) => new URL(p, import.meta.url);
const GAP_SRC  = JSON.parse(readFileSync(here("./data/src-gap.json"),  "utf8"));
const SYN      = JSON.parse(readFileSync(here("./data/src-syn.json"),  "utf8"));
const FAUX_SRC = JSON.parse(readFileSync(here("./data/src-faux.json"), "utf8"));

const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const B_BASE = { A1:-2.2, A2:-1.5, B1:-0.5, B2:0.8, C1:1.8, C2:2.7 };
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4294967295; }
const cefrToB = (cefr,w)=> Math.round((B_BASE[cefr] + (hash(w+cefr)-0.5)*0.7)*100)/100;
const norm = (s)=> String(s).trim();
const lc = (s)=> norm(s).toLowerCase();
const uniq = (arr)=> new Set(arr.map(lc)).size === arr.length;
const rej = { gap:0, syn:0, trap:0 };

const seenGap = new Set(), gap = [];
for (const it of GAP_SRC) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase(), blank = norm(it.blank), ds = (it.distractors||[]).map(norm);
  if (!w || !LEVELS.includes(cefr) || !blank.includes("___") || ds.length < 3) { rej.gap++; continue; }
  if (ds.some(d=>lc(d)===w) || !uniq(ds)) { rej.gap++; continue; }
  if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(blank)) { rej.gap++; continue; }
  if (seenGap.has(w)) continue; seenGap.add(w);
  gap.push({ w, cefr, b: cefrToB(cefr,w), blank, ds, es: norm(it.es), def: norm(it.def||"") });
}
const seenSyn = new Set(), syn = [];
for (const it of SYN) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase(), sent = norm(it.sentence), sy = norm(it.syn), ds = (it.distractors||[]).map(norm);
  if (!w || !LEVELS.includes(cefr) || !sent || !sy || ds.length < 3) { rej.syn++; continue; }
  if (!sent.toLowerCase().includes(w)) { rej.syn++; continue; }
  if (ds.some(d=>lc(d)===lc(sy)) || !uniq([sy,...ds])) { rej.syn++; continue; }
  if (seenSyn.has(w)) continue; seenSyn.add(w);
  syn.push({ w, cefr, b: cefrToB(cefr,w), sent, syn: sy, ds, es: norm(it.es), def: norm(it.def||"") });
}
const seenTrap = new Set(), traps = [];
for (const it of FAUX_SRC) {
  const w = lc(it.w), cefr = norm(it.cefr).toUpperCase();
  const real = norm(it.real), trap = norm(it.trap), d1 = norm(it.d1), d2 = norm(it.d2), note = norm(it.note);
  if (!w || !LEVELS.includes(cefr) || !real || !trap || !d1 || !d2) { rej.trap++; continue; }
  if (!uniq([real,trap,d1,d2])) { rej.trap++; continue; }
  if (seenTrap.has(w)) continue; seenTrap.add(w);
  traps.push({ w, cefr, b: cefrToB(cefr,w), real, trap, d1, d2, note });
}
const out = "// Ejercicios con frase del examen Lexis IT — generado por gen-examen-extra.mjs\n" +
  "window.LEXIS_RICH = " + JSON.stringify({ gap, syn, traps }) + ";\n";
writeFileSync(here("./examen-extra.js"), out, "utf8");
console.log("=== Lexis IT · ejercicios con frase ===");
console.log("gap:", gap.length, "| syn:", syn.length, "| traps:", traps.length, "| TOTAL:", gap.length+syn.length+traps.length);
console.log("rechazados:", JSON.stringify(rej));
