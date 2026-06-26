#!/usr/bin/env node
// Ensambla italiano/vocabulario.html a partir del motor de frances/vocabulario.html
// + el dataset italiano (vocab-italiano.json). Localiza idioma, claves de
// almacenamiento, TTS y etiquetas. Aserciones: aborta si un marcador no aparece.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FR = '/Users/Ruben/Documents/GitHub/idiomas/frances/vocabulario.html';
const src = readFileSync(FR, 'utf8');
const data = JSON.parse(readFileSync(join(__dirname, 'vocab-italiano.json'), 'utf8'));

let out = src;
const reps = []; // [find, replace, expectedCount]
function rep(find, replace, n = 1) { reps.push([find, replace, n]); }

// ---- 1) reemplazar el array DATA ----
const startMark = 'var DATA = [';
const sIdx = out.indexOf(startMark);
if (sIdx < 0) throw new Error('no se encontró "var DATA = ["');
// el cierre es el primer "\n];" tras el inicio
const eIdx = out.indexOf('\n];', sIdx);
if (eIdx < 0) throw new Error('no se encontró cierre "];" de DATA');
const before = out.slice(0, sIdx);
const after = out.slice(eIdx + 3); // tras "\n];"
const dataJs = 'var DATA = ' + JSON.stringify(data, null, 1) + ';';
out = before + dataJs + after;

// ---- 2) localización (string replacements con conteo esperado) ----
// idioma / títulos
rep('<html lang="fr"', '<html lang="it"', 1);
rep(' __gcrremoteframetoken="404ea9c883565418985eccb953bf17c4"', '', 1);
rep(' data-__gcrweb-annotatedpagecontent-processed="666A90AA3421D086012789876F7E33A2"', '', 1);
rep('<title>Vocabulaire DELF B1</title>', '<title>Vocabolario · PLIDA B1–B2</title>', 1);
rep('<h1>Vocabulaire</h1>', '<h1>Vocabolario</h1>', 1);

// ordenación local-aware (3 localeCompare)
rep('"fr")', '"it")', 3);
// TTS
rep('u.lang = "fr-FR"', 'u.lang = "it-IT"', 1);

// claves localStorage independientes del francés
rep('delf_', 'ital_', 28);
rep('"srs_nivels"', '"ital_srs_nivels"', 2);
rep('"srs_top_only"', '"ital_srs_top_only"', 2);
rep('"srs_shuffle"', '"ital_srs_shuffle"', 2);
rep('"srs_hard_mode"', '"ital_srs_hard_mode"', 2);
rep('"srsFullscreen"', '"ital_srsFullscreen"', 2);
rep('"mgmt_unlocked"', '"ital_mgmt_unlocked"', 2);
// APP_ID (namespacing nube)
rep("var APP_ID        = 'frances';", "var APP_ID        = 'italiano';", 1);

// etiquetas de UI fr -> it
rep('>▶ Francés<', '>▶ Italiano<', 1);
rep('<label>Palabra en francés</label>', '<label>Palabra en italiano</label>', 1);
rep('<label>Ejemplo en francés</label>', '<label>Ejemplo en italiano</label>', 2);
rep('✍️ Escribe la palabra en francés para continuar (con acentos)',
    '✍️ Escribe la palabra en italiano para continuar (con acentos)', 1);
rep("deberás escribir la palabra correcta en francés (con acentos) antes de continuar",
    "deberás escribir la palabra correcta en italiano (con acentos) antes de continuar", 1);
rep('>fém.</span>', '>fem.</span>', 1);

// temas fijados en el desplegable
rep('var PINNED_TEMAS = ["DELF"];', 'var PINNED_TEMAS = ["Falsos amigos","Expresiones"];', 1);

// añadir General y Expresiones a los 4 mapas de color/clase
rep('"DELF":"DELF"', '"DELF":"DELF","General":"SOC","Expresiones":"CUL"', 2);
rep('"DELF":"#1a1a4d"', '"DELF":"#1a1a4d","General":"#33373b","Expresiones":"#5a3d6a"', 2);

// botones de tema del Modo Juego (quitar Arg./Con. vacíos, añadir los poblados)
const oldGameTemas = `      <button class="btn-gf btn-gf-tema active" data-gtema="">Todos</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Alimentación">Alim.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Argumentacion">Arg.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Conectores">Con.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Cultura y ocio">Cult.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Educación">Educ.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Falsos amigos">F.am.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Medio ambiente">M.amb.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Salud">Sal.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Sociedad">Soc.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Tecnologia">Tec.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Trabajo">Trab.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Transporte">Trans.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Viajes">Via.</button>`;
const newGameTemas = `      <button class="btn-gf btn-gf-tema active" data-gtema="">Todos</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Falsos amigos">F.am.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Expresiones">Expr.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Familia">Fam.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Alimentación">Alim.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Salud">Sal.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Trabajo">Trab.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Tecnologia">Tec.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Cultura y ocio">Cult.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Viajes">Via.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Transporte">Trans.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Medio ambiente">M.amb.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="General">Gen.</button>`;
rep(oldGameTemas, newGameTemas, 1);

// ejemplo de importación (JSON) -> muestra italiana
const oldPre = `[{"w":"Il convient de rappeler que…","t":"Conviene recordar que…","tema":"DELF","subtema":"Citar fuentes","cat":"Expresion","nivel":"B2","ex_fr":"Il convient de rappeler que cette loi a été adoptée en 2005.","ex_es":"Conviene recordar que esta ley fue adoptada en 2005.","warn":"Registro formal/escrito. Va al inicio de oración o tras punto y coma. + indicativo.","syn":"il y a lieu de rappeler que","flags":{"top":false,"oral":false}}]`;
const newPre = `[{"w":"affrontare","t":"afrontar","tema":"General","cat":"Verbo","nivel":"B2","ex_fr":"Non è facile affrontare una situazione così difficile.","ex_es":"No es fácil afrontar una situación tan difícil.","warn":null,"syn":"fronteggiare","flags":{"top":false,"oral":false}}]`;
rep(oldPre, newPre, 1);

// PWA offline: manifest + metas apple + registro del service worker
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  + '<link rel="manifest" href="../manifest.webmanifest">\n'
  + '<link rel="apple-touch-icon" href="../apple-touch-icon.png">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  + '<meta name="apple-mobile-web-app-title" content="Vocabolario">\n'
  + '<meta name="mobile-web-app-capable" content="yes">\n'
  + '<meta name="theme-color" content="#7a1a2d">', 1);
rep('</body></html>',
  '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){'
  + 'navigator.serviceWorker.register("../sw.js",{scope:"../"}).catch(function(){});});}</script>\n</body></html>', 1);

// ---- aplicar con verificación ----
for (const [find, replace, n] of reps) {
  const count = out.split(find).length - 1;
  if (count !== n) {
    throw new Error(`Marcador inesperado (${count}≠${n}): ${JSON.stringify(find.slice(0, 60))}`);
  }
  out = out.split(find).join(replace);
}

writeFileSync(join(__dirname, 'vocabulario.html'), out);
console.log('OK -> italiano/vocabulario.html (' + data.length + ' tarjetas, ' + out.length + ' bytes)');
