# Lexis — examen adaptativo de vocabulario inglés (A2–C2)

Test de vocabulario **adaptativo real** (Computer Adaptive Testing) basado en
**Teoría de Respuesta al Ítem (IRT)**. Sin IA en tiempo de ejecución: solo
estadística determinista. Pensado para preparar **C1 (Linguaskill / Cambridge)**,
con foco en B2–C1–C2 pero cubriendo A2–C2 para que el motor discrimine bien.

Forma parte del sitio *English · Complete Reference* (`index.html` → tarjeta
**Lexis · Examen adaptativo**). Es 100 % estático: se abre como archivo o se
despliega en GitHub Pages sin paso de build.

## Tipos de ejercicio (se alternan en la misma sesión, estilo Linguaskill)

| Tipo | Qué se ve | Qué se elige |
|------|-----------|--------------|
| **Rellena el hueco** | una frase con un hueco `___` | la palabra que encaja |
| **Sinónimo en contexto** | una frase con la palabra resaltada | su sinónimo |
| **Traducción** (EN↔ES) | una palabra o su significado | la equivalencia |
| **Falso amigo** | una palabra "trampa" para hispanohablantes | su significado real |
| **Phrasal verb** | una frase con hueco, o el phrasal verb | el phrasal verb / su significado |

### Selector de tema

Antes de empezar (práctica o examen) eliges el **tema**, que filtra los tipos:
**Mezclado** (todos), **Vocabulario** (traducción), **Frases** (hueco + sinónimo),
**Phrasal verbs** y **Falsos amigos**. La preferencia se guarda.

### Control de exposición

El motor recuerda las últimas ~700 palabras vistas (`lexis.seen`) y evita
repetirlas entre sesiones, así cada examen trae vocabulario fresco (antes
tendía a repetir las mismas palabras y a inflar el nivel por memorización).

La selección rota los tipos (sin repetir el mismo más de 2 veces seguidas) y,
dentro de cada tipo, elige el ítem de **máxima información de Fisher** en el θ
actual (es decir, `|b − θ̂|` mínimo).

## Motor IRT

- **Modelo 3PL con adivinación**: `P(θ,b) = c + (1−c)/(1 + e^(−(θ − b)))`, con
  `c = 0.25` (≈ 1/opciones). El suelo de adivinación evita que los aciertos por
  azar/eliminación en ítems difíciles inflen θ (causa de los resultados
  "siempre C2"). Verificado por simulación con un modelo de respuesta que sí
  adivina: un B2 ahora se reporta como B2, no como C2.
- **Estimación EAP** (Expected A Posteriori) sobre una rejilla θ ∈ [−4, 4] paso
  0.1, con prior normal `N(priorMean, 1.5)`. Se usa EAP en lugar de máxima
  verosimilitud porque **es finito y estable** incluso con patrones
  todo-acierto / todo-fallo.
  - **Prior neutro en examen** (`priorMean = 0`, `priorSd = 1.8`): cada examen
    es una medición fresca e independiente, para que una sesión buena no
    "arrastre" el nivel en la siguiente. La práctica sí parte de tu último θ.
- **Nivel reportado = estimador puntual θ̂** (insesgado: ni permisivo ni
  penalizador) y se muestra el **margen** de confianza `θ̂ ± SE`
  (p. ej. "C1 · margen C1–C2") para ser transparentes sobre la precisión.
  Verificado por simulación (60 personas por nivel): un B2 casi nunca se reporta
  como C1 (~5 %), mientras que un C1/C2 real alcanza su nivel la mayoría de las
  veces. **A más preguntas, menor SE y medición más fiable** → para confirmar
  C1/C2 conviene el examen de 40 o el adaptativo.
- **Regla de parada (solo examen)**: `SE ≤ 0.45`, con **mínimo 12** y
  **máximo 25** ítems. Con Rasch puro la información por ítem ≤ 0.25, así que un
  umbral más estricto exigiría demasiadas preguntas.
- **Mapeo θ → CEFR** (anclaje transparente, en `examen.html`):

  ```
  θ < −1.3 → A2 | −1.3..−0.3 → B1 | −0.3..0.9 → B2 bajo
  0.9..1.6 → B2 | 1.6..2.3 → C1 | θ ≥ 2.3 → C2
  ```

- **Escala Cambridge orientativa (NO oficial)**: `clamp(162 + 17·θ, 100, 210)`.

### Mapeo CEFR → dificultad `b` (semilla)

```
A2 → −1.5 | B1 → −0.5 | B2 → +0.8 | C1 → +1.8 | C2 → +2.7
```

Dentro de cada banda, `b` se dispersa ±0.35 de forma determinista (hash de la
palabra), para reproducibilidad. **El nivel CEFR de cada palabra es una
*semilla*** derivada de listas por nivel y de conocimiento léxico estándar; la
dificultad psicométrica "real" se afinaría con datos de respuesta (ver Supabase).

## Modos

- **Práctica**: barra de nivel (gauge A2→C2 con banda de confianza θ±SE) visible
  y actualizada en directo; entrada de diccionario tras cada respuesta
  (palabra, traducción, definición, sinónimo y aviso de falso amigo si aplica);
  prioriza las palabras falladas. Sesión sin fin. La barra se puede ocultar
  manualmente (preferencia guardada).
- **Examen**: barra oculta, sin correcciones hasta el final. Antes de empezar
  eliges la **longitud**: 10 (rápido), 20 (estándar), 40 (completo) o
  **Adaptativo** (termina solo con la regla de parada `SE ≤ 0.45`, 12–25 ítems).
  Al acabar muestra CEFR, θ, SE, aciertos, escala orientativa y lista de
  vocabulario para repasar. "Repetir examen" reutiliza la última longitud.

Teclado: `1`–`4` para responder, `Enter`/`Espacio` para continuar.

## Historial y repaso (SRS)

Cada respuesta (en práctica y examen) se guarda en `lexis.vocab` con su fecha:
nº de aciertos/fallos, fecha de aprendizaje y estado de repetición espaciada.
Los exámenes completos se registran en `lexis.sessions`.

- **Historial** (botón en la home): pestañas **Aprendidas** (palabras acertadas,
  con es/en/nivel y fecha), **Falladas**, **Por días** (agrupa los exámenes del
  día con su nivel medio; clic para desplegar cada partida) y **Timeline**.
- **Flashcards** (SRS estilo SM-2): tras cada examen las palabras entran en el
  mazo — los **aciertos** como "bien" y los **fallos** como "otra vez" (repaso
  inmediato). En el repaso, cada tarjeta se califica *Otra vez / Difícil / Bien
  / Fácil* y se reprograma. La home muestra cuántas tarjetas tocan hoy.

## Estructura

```
ingles/
├─ examen.html            # app completa (motor IRT + UI)
├─ examen-data.js         # banco de traducción (4.349 términos) — generado
├─ examen-extra.js        # gap-fill + sinónimos + falsos amigos (904) — generado
├─ examen-phrasal.js      # tema phrasal verbs (222 A2–C2) — generado
├─ gen-examen-data.mjs    # pipeline del banco de traducción
├─ gen-examen-extra.mjs   # pipeline de los ejercicios con frase
├─ gen-examen-phrasal.mjs # pipeline del tema phrasal verbs
├─ data/                  # lotes fuente verificados (JSON) de los pipelines
├─ supabase-sync.js       # sincronización opcional (no-op sin config)
├─ config.example.js      # plantilla de credenciales → copiar a config.js
└─ supabase/schema.sql    # tablas, RLS, índices y trigger
```

### Regenerar los bancos

```bash
node gen-examen-data.mjs    # → examen-data.js (valida, deduplica, asigna b)
node gen-examen-extra.mjs   # → examen-extra.js
```

Ambos validan los lotes de `data/` y avisan de ítems mal formados (opciones
duplicadas, falta de campos, respuesta dentro de la frase del hueco, etc.).

## Supabase (opcional)

La app funciona sin red usando `localStorage`. Para sincronizar progreso y
guardar respuestas en la nube (y poder recalibrar):

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor.
2. `cp config.example.js config.js` y rellena `supabaseUrl` y `supabaseAnonKey`.
   `config.js` está en `.gitignore` (no subir claves).
3. Recarga. Si las credenciales son válidas, `supabase-sync.js` carga el cliente
   por ESM CDN, restaura el progreso remoto y encola las respuestas
   (con reenvío automático al recuperar conexión).

### Decisión de auth — Opción A (implementada)

App personal con **anon key** y RLS activa; la separación por perfil la hace el
cliente (filtra por `profile_id`). Es un **modelo de confianza relajado**,
adecuado para uso personal, **no** para multiusuario no confiable. La `anon key`
es pública por diseño.

**Opción B (más segura, documentada, no implementada):** Supabase Auth con
magic link por email y políticas RLS basadas en `auth.uid()`. Más fricción.

## Recalibración empírica (esqueleto)

`responses` guarda cada respuesta con el θ del usuario en ese momento. Cuando un
ítem acumule ≥ 30 respuestas, su `b` puede recalcularse por máxima verosimilitud
y marcarse `b_source = 'empirical'` en la tabla `items`. El trigger
`bump_item_stats` mantiene `n_responses` / `n_correct`.

## Aviso

El resultado es **orientativo**. Los niveles CEFR del banco son semilla y la
escala tipo Cambridge no es oficial; no equivale a una certificación.
