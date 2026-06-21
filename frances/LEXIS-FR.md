# Lexis FR — examen adaptativo de vocabulario francés (A1–C2)

Misma arquitectura que el Lexis inglés (`idiomas/ingles`), adaptada a francés→
español. Motor IRT idéntico (modelo 3PL con adivinación, estimación EAP, selección
por información de Fisher, parada SE≤0.45 / 12–25 ítems o longitud fija) y mismas
funciones: práctica con medidor en directo, examen con selector de longitud
(10/20/40/Auto), historial (aprendidas, falladas, días, timeline) y flashcards SRS.

Accesible desde `frances/index.html` (tarjeta **Lexis FR · Examen adaptativo**).

## Diferencias respecto al inglés

- **Banco francés**: 2253 términos FR→ES (A1–C2), 544 ejercicios con frase
  (huecos + sinónimos + faux amis) y 219 expresiones idiomáticas.
- **Temas**: Mezclado · Vocabulario · Frases · **Expresiones** (locuciones
  idiomáticas, reutilizan la maquinaria del motor) · **Faux amis**.
- **Escala TCF** orientativa (no oficial) en vez de la Cambridge: θ → 100–699.
- **Acento dorado** para coexistir visualmente con la sección de francés.
- **Namespace de progreso independiente**: usa claves `lexisfr.*` en
  localStorage, así el progreso de francés y de inglés nunca se mezclan.
- Sin Supabase (el motor inglés lo trae como opción; aquí va solo en local).

## Ficheros

```
frances/
├─ examen.html            # app (copia adaptada del motor inglés)
├─ examen-data.js         # 2253 términos FR→ES — generado
├─ examen-extra.js        # huecos + sinónimos + faux amis — generado
├─ examen-phrasal.js      # expresiones idiomáticas — generado
├─ gen-examen-data.mjs    # pipeline del banco de traducción
├─ gen-examen-extra.mjs   # pipeline de los ejercicios con frase
├─ gen-examen-phrasal.mjs # pipeline de las expresiones (lee data/src-expr.json)
└─ data/                  # lotes fuente verificados (JSON)
```

Regenerar: `node gen-examen-data.mjs && node gen-examen-extra.mjs && node gen-examen-phrasal.mjs`.

## Aviso

Niveles CEFR semilla (sin calibrar empíricamente) y escala TCF orientativa; no
equivale a una certificación oficial. Generado con verificación de formato pero
puede haber algún desliz puntual de nivel o traducción en un banco tan amplio.
