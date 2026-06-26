# Lexis PT — examen adaptativo de vocabulario portugués (BR) (A1–C2)

Misma arquitectura que el Lexis italiano/inglés/francés, adaptada a portugués(BR)→español
(enfoque **CELPE-Bras**). Motor IRT idéntico (3PL, estimación EAP, selección por información
de Fisher), con práctica, examen (10/20/40/Auto), historial y flashcards SRS.

Accesible desde `portugues/index.html` (tarjeta **Lexis PT · Examen adaptativo**).

## Datos (generados por IA, verificación de formato)

- **Banco**: 1503 términos PT(BR)→ES (A1–C2).
- **Ejercicios con frase**: 196 huecos + 114 sinónimos + 87 falsos amigos = 397.
- **Expresiones**: 117 modismos brasileños.
- **Índice CELPE-Bras** orientativo 0–100 (no oficial). Acento teal. Progreso solo local
  (namespace `lexispt.*`), independiente de las demás lenguas.

## Vocabulario (juego + SRS)

`portugues/vocabulario.html` — 1657 tarjetas (léxico + falsos amigos + expresiones),
enriquecidas con tema, categoría, género y ejemplo bilingüe PT+ES. Mismo motor que las
demás lenguas (búsqueda, filtros, Modo Juego, Repaso SRS, TTS pt-BR, prefijo `port_`).

## Ficheros y regeneración

```
portugues/
├─ examen.html / vocabulario.html        # apps (build-examen / build-vocab)
├─ examen-data.js / -extra.js / -phrasal.js   # generados
├─ vocab-portugues.json                   # dataset del vocabulario
├─ gen-examen-*.mjs · gen-vocab-portugues.mjs · merge-enrich-portugues.mjs
├─ build-examen-portugues.mjs · build-vocab-portugues.mjs
└─ data/  src-trans.json · src-gap.json · src-syn.json · src-faux.json · src-expr.json
```

Pipeline: el léxico y los ejercicios se generaron con workflows multi-agente →
`data/src-*.json` → `node gen-examen-data.mjs && node gen-examen-extra.mjs && node gen-examen-phrasal.mjs`;
el vocabulario: `gen-vocab-portugues.mjs` → enriquecimiento (workflow) → `merge-enrich-portugues.mjs` → `build-vocab-portugues.mjs`.
El examen: `node build-examen-portugues.mjs`.

## Aviso

Niveles CEFR semilla (sin calibrar) e índice CELPE-Bras orientativo; no equivale a una
certificación oficial. Generado con IA y verificación de formato; puede haber algún desliz
puntual de nivel o traducción.
