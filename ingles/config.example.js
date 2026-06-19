// ─────────────────────────────────────────────────────────────────────────
//  LEXIS · configuración opcional de Supabase
//  Copia este archivo como  config.js  y rellena tus credenciales.
//  · Si config.js NO existe, Lexis funciona perfectamente en local
//    (el progreso se guarda en localStorage). La sincronización en la nube
//    es totalmente opcional.
//  · Añade  config.js  a tu .gitignore para no exponer las claves.
//  La  anon key  es pública por diseño; protege tus datos con RLS
//  (ver supabase/schema.sql y el README).
// ─────────────────────────────────────────────────────────────────────────
window.LEXIS_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_ANON_KEY",
  profile: "Invitado",   // nombre de perfil para esta sesión
};
