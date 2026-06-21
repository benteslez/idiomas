# Lexis IT — examen adaptativo de vocabulario italiano (A1–C2)

Misma arquitectura que el Lexis inglés (`idiomas/ingles`) y francés (`idiomas/frances`),
adaptada a italiano→español. Motor IRT idéntico (modelo 3PL con adivinación, estimación
EAP, selección por información de Fisher, parada SE≤0.45 / 12–25 ítems o longitud fija) y
mismas funciones: práctica con medidor en directo, examen con selector de longitud
(10/20/40/Auto), historial (aprendidas, falladas, días, timeline) y flashcards SRS.

Accesible desde `italiano/index.html` (tarjeta **Lexis IT · Examen adaptativo**).

## Diferencias respecto al inglés

- **Banco italiano**: 2345 términos IT→ES (A1–C2), 714 ejercicios con frase
  (419 huecos + 200 sinónimos + 95 falsi amici) y 239 expresiones idiomáticas.
- **Temas**: Mezclado · Vocabulario · Frases · **Espressioni** (locuciones y
  modismos, reutilizan la maquinaria del motor) · **Falsi amici**.
- **Índice CILS** orientativo 0–100 (no oficial) en vez de la escala Cambridge:
  θ → `Math.round(Math.max(0, Math.min(100, 50 + 18·θ)))` (θ=0 ≈ 50, C2 ≈ 99, A1 ≈ 10).
- **Acento verde** para coexistir visualmente con la sección de italiano.
- **Namespace de progreso independiente**: usa claves `lexisit.*` en
  localStorage, así el progreso de italiano, francés e inglés nunca se mezclan.
- Sin Supabase (el motor inglés lo trae como opción; aquí va solo en local).

## Ficheros

```
italiano/
├─ examen.html            # app (copia adaptada del motor inglés)
├─ examen-data.js         # 2345 términos IT→ES — generado
├─ examen-extra.js        # huecos + sinónimos + falsi amici — generado
├─ examen-phrasal.js      # expresiones / modismos — generado
├─ gen-examen-data.mjs    # pipeline del banco de traducción (lee data/src-trans.json)
├─ gen-examen-extra.mjs   # pipeline de los ejercicios con frase (lee data/src-{gap,syn,faux}.json)
├─ gen-examen-phrasal.mjs # pipeline de las expresiones (lee data/src-expr.json)
└─ data/                  # lotes fuente verificados (JSON)
   ├─ src-trans.json      # [it, es, cefr] por nivel (concatenado)
   ├─ src-gap.json        # {w, cefr, blank, distractors, es, def}
   ├─ src-syn.json        # {w, cefr, sentence, syn, distractors, es, def}
   ├─ src-faux.json       # {w, cefr, real, trap, d1, d2, note}
   └─ src-expr.json       # {expr, cefr, es, sentence, def, distractors}
```

Regenerar: `node gen-examen-data.mjs && node gen-examen-extra.mjs && node gen-examen-phrasal.mjs`.

## Aviso

Niveles CEFR semilla (sin calibrar empíricamente) e índice CILS orientativo; no
equivale a una certificación oficial. Generado con verificación de formato pero
puede haber algún desliz puntual de nivel o traducción en un banco tan amplio.
