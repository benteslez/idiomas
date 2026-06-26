#!/usr/bin/env node
// Ensambla ingles/vocabulario.html desde el motor de frances/vocabulario.html
// + vocab-ingles.json. Localiza idioma (en), TTS en-GB, almacenamiento (ingl_),
// etiquetas, temas (General/Phrasal verbs), oculta género, añade nivel A2, PWA.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FR = '/Users/Ruben/Documents/GitHub/idiomas/frances/vocabulario.html';
const src = readFileSync(FR, 'utf8');
const data = JSON.parse(readFileSync(join(__dirname, 'vocab-ingles.json'), 'utf8'));

let out = src;
const reps = [];
const rep = (f, r, n = 1) => reps.push([f, r, n]);

// 1) reemplazar DATA
const sIdx = out.indexOf('var DATA = [');
const eIdx = out.indexOf('\n];', sIdx);
if (sIdx < 0 || eIdx < 0) throw new Error('no se localizó el array DATA');
out = out.slice(0, sIdx) + 'var DATA = ' + JSON.stringify(data, null, 1) + ';' + out.slice(eIdx + 3);

// 2) idioma / títulos
rep('<html lang="fr"', '<html lang="en"', 1);
rep(' __gcrremoteframetoken="404ea9c883565418985eccb953bf17c4"', '', 1);
rep(' data-__gcrweb-annotatedpagecontent-processed="666A90AA3421D086012789876F7E33A2"', '', 1);
rep('<title>Vocabulaire DELF B1</title>', '<title>Vocabulary · Inglés A2–C2</title>', 1);
rep('<h1>Vocabulaire</h1>', '<h1>Vocabulary</h1>', 1);

// 3) ordenación y TTS
rep('"fr")', '"en")', 3);
rep('u.lang = "fr-FR"', 'u.lang = "en-GB"', 1);

// 4) almacenamiento independiente
rep('delf_', 'ingl_', 28);
rep('"srs_nivels"', '"ingl_srs_nivels"', 2);
rep('"srs_top_only"', '"ingl_srs_top_only"', 2);
rep('"srs_shuffle"', '"ingl_srs_shuffle"', 2);
rep('"srs_hard_mode"', '"ingl_srs_hard_mode"', 2);
rep('"srsFullscreen"', '"ingl_srsFullscreen"', 2);
rep('"mgmt_unlocked"', '"ingl_mgmt_unlocked"', 2);
rep("var APP_ID        = 'frances';", "var APP_ID        = 'ingles';", 1);
// Claves de PERFIL globales: compartidas con index.html (que las fija), para no
// entrar en bucle de selección de perfil. El progreso sí va por idioma (ingl_).
rep('ingl_active_profile', 'delf_active_profile', 1);
rep('ingl_profile_unlocked', 'delf_profile_unlocked', 1);

// 5) etiquetas UI
rep('>▶ Francés<', '>▶ Inglés<', 1);
rep('<label>Palabra en francés</label>', '<label>Palabra en inglés</label>', 1);
rep('<label>Ejemplo en francés</label>', '<label>Ejemplo en inglés</label>', 2);
rep('✍️ Escribe la palabra en francés para continuar (con acentos)',
    '✍️ Escribe la palabra en inglés para continuar', 1);
rep('deberás escribir la palabra correcta en francés (con acentos) antes de continuar',
    'deberás escribir la palabra correcta en inglés antes de continuar', 1);

// 6) inglés sin género: ocultar el filtro de género
rep('<div class="dd" data-dd="gen">', '<div class="dd" data-dd="gen" hidden>', 1);

// 7) nivel A2 (estilo + opción de filtro)
rep('.badge-nivel-B1 { background: #2d7a3a; }', '.badge-nivel-A2 { background: #5a8a2d; }\n.badge-nivel-B1 { background: #2d7a3a; }', 1);
rep('<button class="dd-item" data-nivel="B1">B1</button>',
    '<button class="dd-item" data-nivel="A2">A2</button>\n          <button class="dd-item" data-nivel="B1">B1</button>', 1);

// 8) temas fijados + mapas de color (General + Phrasal verbs)
rep('var PINNED_TEMAS = ["DELF"];', 'var PINNED_TEMAS = ["Falsos amigos","Phrasal verbs"];', 1);
rep('"DELF":"DELF"', '"DELF":"DELF","General":"SOC","Phrasal verbs":"CON"', 2);
rep('"DELF":"#1a1a4d"', '"DELF":"#1a1a4d","General":"#33373b","Phrasal verbs":"#1a3558"', 2);

// 9) botones de tema del Modo Juego
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
      <button class="btn-gf btn-gf-tema" data-gtema="Phrasal verbs">Phr.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Falsos amigos">F.am.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Personalidad">Pers.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Sentimientos">Sent.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Trabajo">Trab.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Sociedad">Soc.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Salud">Sal.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Tecnologia">Tec.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Educación">Educ.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="Política y ciudadanía">Pol.</button>
      <button class="btn-gf btn-gf-tema" data-gtema="General">Gen.</button>`;
rep(oldGameTemas, newGameTemas, 1);

// 10) ejemplo de importación
const oldPre = `[{"w":"Il convient de rappeler que…","t":"Conviene recordar que…","tema":"DELF","subtema":"Citar fuentes","cat":"Expresion","nivel":"B2","ex_fr":"Il convient de rappeler que cette loi a été adoptée en 2005.","ex_es":"Conviene recordar que esta ley fue adoptada en 2005.","warn":"Registro formal/escrito. Va al inicio de oración o tras punto y coma. + indicativo.","syn":"il y a lieu de rappeler que","flags":{"top":false,"oral":false}}]`;
const newPre = `[{"w":"to achieve","t":"lograr / conseguir","tema":"General","cat":"Verbo","nivel":"B2","ex_fr":"She worked hard to achieve her goals.","ex_es":"Trabajó duro para lograr sus objetivos.","warn":null,"syn":"to accomplish","flags":{"top":false,"oral":false}}]`;
rep(oldPre, newPre, 1);

// 11) PWA offline
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  + '<link rel="manifest" href="../manifest.webmanifest">\n'
  + '<link rel="apple-touch-icon" href="../apple-touch-icon.png">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  + '<meta name="apple-mobile-web-app-title" content="Vocabulary">\n'
  + '<meta name="mobile-web-app-capable" content="yes">\n'
  + '<meta name="theme-color" content="#163494">', 1);
rep('</body></html>',
  '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){'
  + 'navigator.serviceWorker.register("../sw.js",{scope:"../"}).catch(function(){});});}</script>\n</body></html>', 1);

// 12) "Top B1" -> "Top" (niveles A2–C2: "Top B1" no aplica al inglés)
rep('Top B1', 'Top', 12);

// aplicar con verificación
for (const [f, r, n] of reps) {
  const count = out.split(f).length - 1;
  if (count !== n) throw new Error(`Marcador inesperado (${count}≠${n}): ${JSON.stringify(f.slice(0, 60))}`);
  out = out.split(f).join(r);
}

writeFileSync(join(__dirname, 'vocabulario.html'), out);
console.log('OK -> ingles/vocabulario.html (' + data.length + ' tarjetas, ' + out.length + ' bytes)');
