// Pipeline del banco de traducción IT→ES para el examen Lexis IT.
// Lee data/src-trans.json (lotes por nivel concatenados), limpia, deduplica por
// palabra, asigna `b` y escribe examen-data.js (window.LEXIS_ITEMS).
//   node gen-examen-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
const here = (p) => new URL(p, import.meta.url);
const SRC = JSON.parse(readFileSync(here("./data/src-trans.json"), "utf8"));

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const B_BASE = { A1: -2.2, A2: -1.5, B1: -0.5, B2: 0.8, C1: 1.8, C2: 2.7 };
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4294967295; }
const cefrToB = (cefr, w) => Math.round((B_BASE[cefr] + (hash(w+cefr)-0.5)*0.7)*100)/100;

const seen = new Map(); const byLevel = { A1:0,A2:0,B1:0,B2:0,C1:0,C2:0 }; let rejected = 0;
for (const e of SRC) {
  if (!Array.isArray(e) || e.length < 3) { rejected++; continue; }
  const w = String(e[0]).trim(); const es = String(e[1]).trim(); const cefr = String(e[2]).trim().toUpperCase();
  if (!w || !es || !LEVELS.includes(cefr)) { rejected++; continue; }
  const key = w.toLowerCase();
  if (seen.has(key)) continue;
  seen.set(key, [w, es, cefr, cefrToB(cefr, w)]); byLevel[cefr]++;
}
const items = [...seen.values()].sort((a,b)=>a[3]-b[3]);
const out = "// Banco léxico IT→ES del examen Lexis IT — generado por gen-examen-data.mjs\n" +
  "// [parola, traducción, cefr, b]\nwindow.LEXIS_ITEMS = " + JSON.stringify(items) + ";\n";
writeFileSync(here("./examen-data.js"), out, "utf8");
console.log("=== Banco IT→ES ===");
console.log("Total únicos:", items.length, "| " + LEVELS.map(l=>`${l}:${byLevel[l]}`).join(" "));
console.log("Rechazados/duplicados:", rejected);
