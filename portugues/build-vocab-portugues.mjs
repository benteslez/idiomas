#!/usr/bin/env node
// Ensambla portugues/vocabulario.html desde el motor frances/vocabulario.html
// + vocab-portugues.json. Localiza a portugués (pt-BR), almacenamiento port_,
// etiquetas, temas General/Expresiones, niveles A1/A2, PWA offline.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FR = '/Users/Ruben/Documents/GitHub/idiomas/frances/vocabulario.html';
const src = readFileSync(FR, 'utf8');
const data = JSON.parse(readFileSync(join(__dirname, 'vocab-portugues.json'), 'utf8'));

let out = src;
const reps = [];
const rep = (f, r, n = 1) => reps.push([f, r, n]);

// DATA
const sIdx = out.indexOf('var DATA = [');
const eIdx = out.indexOf('\n];', sIdx);
if (sIdx < 0 || eIdx < 0) throw new Error('no se localizó DATA');
out = out.slice(0, sIdx) + 'var DATA = ' + JSON.stringify(data, null, 1) + ';' + out.slice(eIdx + 3);

// idioma / títulos
rep('<html lang="fr"', '<html lang="pt-BR"', 1);
rep(' __gcrremoteframetoken="404ea9c883565418985eccb953bf17c4"', '', 1);
rep(' data-__gcrweb-annotatedpagecontent-processed="666A90AA3421D086012789876F7E33A2"', '', 1);
rep('<title>Vocabulaire DELF B1</title>', '<title>Vocabulário · Português A1–C2</title>', 1);
rep('<h1>Vocabulaire</h1>', '<h1>Vocabulário</h1>', 1);

// ordenación + TTS
rep('"fr")', '"pt")', 3);
rep('u.lang = "fr-FR"', 'u.lang = "pt-BR"', 1);

// almacenamiento independiente
rep('delf_', 'port_', 28);
rep('"srs_nivels"', '"port_srs_nivels"', 2);
rep('"srs_top_only"', '"port_srs_top_only"', 2);
rep('"srs_shuffle"', '"port_srs_shuffle"', 2);
rep('"srs_hard_mode"', '"port_srs_hard_mode"', 2);
rep('"srsFullscreen"', '"port_srsFullscreen"', 2);
rep('"mgmt_unlocked"', '"port_mgmt_unlocked"', 2);
rep("var APP_ID        = 'frances';", "var APP_ID        = 'portugues';", 1);
// Claves de PERFIL globales: compartidas con index.html (que las fija), para no
// entrar en bucle de selección de perfil. El progreso sí va por idioma (port_).
rep('port_active_profile', 'delf_active_profile', 1);
rep('port_profile_unlocked', 'delf_profile_unlocked', 1);

// etiquetas UI
rep('>▶ Francés<', '>▶ Portugués<', 1);
rep('<label>Palabra en francés</label>', '<label>Palabra en portugués</label>', 1);
rep('<label>Ejemplo en francés</label>', '<label>Ejemplo en portugués</label>', 2);
rep('✍️ Escribe la palabra en francés para continuar (con acentos)',
    '✍️ Escribe la palabra en portugués para continuar (con acentos)', 1);
rep('deberás escribir la palabra correcta en francés (con acentos) antes de continuar',
    'deberás escribir la palabra correcta en portugués (con acentos) antes de continuar', 1);

// niveles A1/A2 (estilo + opciones de filtro)
rep('.badge-nivel-B1 { background: #2d7a3a; }',
    '.badge-nivel-A1 { background: #6a9a3a; }\n.badge-nivel-A2 { background: #5a8a2d; }\n.badge-nivel-B1 { background: #2d7a3a; }', 1);
rep('<button class="dd-item" data-nivel="B1">B1</button>',
    '<button class="dd-item" data-nivel="A1">A1</button>\n          <button class="dd-item" data-nivel="A2">A2</button>\n          <button class="dd-item" data-nivel="B1">B1</button>', 1);

// temas fijados + mapas de color (General + Expresiones)
rep('var PINNED_TEMAS = ["DELF"];', 'var PINNED_TEMAS = ["Falsos amigos","Expresiones"];', 1);
rep('"DELF":"DELF"', '"DELF":"DELF","General":"SOC","Expresiones":"CUL"', 2);
rep('"DELF":"#1a1a4d"', '"DELF":"#1a1a4d","General":"#33373b","Expresiones":"#5a3d6a"', 2);

// botones de tema del Modo Juego
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

// ejemplo de importación
const oldPre = `[{"w":"Il convient de rappeler que…","t":"Conviene recordar que…","tema":"DELF","subtema":"Citar fuentes","cat":"Expresion","nivel":"B2","ex_fr":"Il convient de rappeler que cette loi a été adoptée en 2005.","ex_es":"Conviene recordar que esta ley fue adoptada en 2005.","warn":"Registro formal/escrito. Va al inicio de oración o tras punto y coma. + indicativo.","syn":"il y a lieu de rappeler que","flags":{"top":false,"oral":false}}]`;
const newPre = `[{"w":"conseguir","t":"lograr / conseguir","tema":"General","cat":"Verbo","nivel":"B1","ex_fr":"Depois de muito esforço, consegui terminar o projeto.","ex_es":"Después de mucho esfuerzo, logré terminar el proyecto.","warn":null,"syn":"alcançar","flags":{"top":false,"oral":false}}]`;
rep(oldPre, newPre, 1);

// PWA offline
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  + '<link rel="manifest" href="../manifest.webmanifest">\n'
  + '<link rel="apple-touch-icon" href="../apple-touch-icon.png">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  + '<meta name="apple-mobile-web-app-title" content="Vocabulário">\n'
  + '<meta name="mobile-web-app-capable" content="yes">\n'
  + '<meta name="theme-color" content="#8b4a0a">', 1);
// (El snippet de registro del SW ya viene heredado del template francés con la
// misma ruta relativa '../sw.js' y el mismo scope, así que no hace falta
// re-añadirlo aquí — re-añadirlo dejaba el snippet DUPLICADO al final del body.)

for (const [f, r, n] of reps) {
  const count = out.split(f).length - 1;
  if (count !== n) throw new Error(`Marcador inesperado (${count}≠${n}): ${JSON.stringify(f.slice(0, 60))}`);
  out = out.split(f).join(r);
}
writeFileSync(join(__dirname, 'vocabulario.html'), out);
console.log('OK -> portugues/vocabulario.html (' + data.length + ' tarjetas, ' + out.length + ' bytes)');
