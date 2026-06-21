// Pipeline del tema "expresiones idiomáticas" del examen Lexis FR.
// Lee data/src-expr.json, valida, deduplica, asigna b y escribe examen-phrasal.js
// (window.LEXIS_PHRASAL, con la misma forma {pv,cefr,b,es,sent,ds,def} que usa el motor).
import { readFileSync, writeFileSync } from "node:fs";
const here = (p) => new URL(p, import.meta.url);
const SRC = JSON.parse(readFileSync(here("./data/src-expr.json"), "utf8"));

const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const B_BASE = { A1:-2.2, A2:-1.5, B1:-0.5, B2:0.8, C1:1.8, C2:2.7 };
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4294967295; }
const cefrToB = (cefr,w)=> Math.round((B_BASE[cefr] + (hash(w+cefr)-0.5)*0.7)*100)/100;
const norm = (s)=> String(s).trim();
const lc = (s)=> norm(s).toLowerCase();

const seen = new Set(), out = []; let rejected = 0;
for (const it of SRC) {
  const pv = lc(it.expr), cefr = norm(it.cefr).toUpperCase();
  const es = norm(it.es), sent = norm(it.sentence), ds = (it.distractors||[]).map(lc);
  if (!pv || !LEVELS.includes(cefr) || !es || ds.length < 3) { rejected++; continue; }
  if (ds.some(d=>d===pv) || new Set(ds).size < 3) { rejected++; continue; }
  // No exigimos que la frase contenga la expresión literal (en FR el verbo se
  // conjuga); el motor usa el subtipo "hueco" solo si coincide, si no, "significado".
  if (seen.has(pv)) continue; seen.add(pv);
  out.push({ pv, cefr, b: cefrToB(cefr,pv), es, sent, ds, def: norm(it.def||"") });
}
out.sort((a,b)=>a.b-b.b);
const js = "// Tema 'expresiones idiomáticas' del examen Lexis FR — generado por gen-examen-phrasal.mjs\n" +
  "window.LEXIS_PHRASAL = " + JSON.stringify(out) + ";\n";
writeFileSync(here("./examen-phrasal.js"), js, "utf8");
const byLvl = LEVELS.map(l=>`${l}:${out.filter(x=>x.cefr===l).length}`).join(" ");
console.log("=== Lexis FR · expresiones ===");
console.log("Total únicas:", out.length, "|", byLvl, "| rechazadas:", rejected);
