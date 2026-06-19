/* ============================================================================
   LEXIS · capa de sincronización con Supabase (OPCIONAL y tolerante a fallos)
   ----------------------------------------------------------------------------
   - Si no hay window.LEXIS_CONFIG (config.js), todo queda deshabilitado y la
     app sigue funcionando solo con localStorage. Ninguna llamada lanza error.
   - Cola offline en localStorage: las respuestas pendientes se reenvían cuando
     vuelve la conexión.
   Expone window.LexisSync con: enabled, ready, startSession, recordResponse,
   endSession, saveProgress, loadProgress.
   ============================================================================ */
(function () {
  "use strict";
  const cfg = window.LEXIS_CONFIG;
  const QKEY = "lexis.queue";

  const Sync = {
    enabled: !!(cfg && cfg.supabaseUrl && cfg.supabaseAnonKey && !/TU-PROYECTO|TU_ANON/.test(cfg.supabaseUrl + cfg.supabaseAnonKey)),
    ready: false,
    client: null,
    profileId: null,
  };
  window.LexisSync = Sync;

  const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } };
  const saveQueue = (q) => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-500))); } catch {} };

  if (!Sync.enabled) {
    // Versiones no-op para que la app pueda llamar sin comprobar nada.
    Object.assign(Sync, {
      startSession: async () => null,
      recordResponse: () => {},
      endSession: async () => {},
      saveProgress: async () => {},
      loadProgress: async () => null,
    });
    return;
  }

  // ---- inicialización (carga del cliente Supabase por ESM CDN) ----
  Sync.init = async function () {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      Sync.client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } });
      await ensureProfile(cfg.profile || "Invitado");
      Sync.ready = true;
      await flush();
      // restaura progreso remoto y avisa a la UI
      const prog = await Sync.loadProgress();
      if (prog) {
        if (typeof prog.theta === "number") localStorage.setItem("lexis.theta", prog.theta);
        if (prog.cefr) localStorage.setItem("lexis.cefr", prog.cefr);
        if (Array.isArray(prog.weak)) localStorage.setItem("lexis.weak", JSON.stringify(prog.weak));
        window.dispatchEvent(new CustomEvent("lexis:progress", { detail: prog }));
      }
      window.addEventListener("online", flush);
    } catch (e) {
      console.warn("[LexisSync] desactivado (no se pudo inicializar):", e.message);
      Sync.ready = false;
    }
  };

  async function ensureProfile(name) {
    const stored = localStorage.getItem("lexis.profileId");
    if (stored) { Sync.profileId = stored; return; }
    const { data, error } = await Sync.client.from("profiles").insert({ display_name: name }).select("id").single();
    if (error) throw error;
    Sync.profileId = data.id;
    localStorage.setItem("lexis.profileId", data.id);
  }

  // ---- API ----
  Sync.startSession = async function (mode) {
    if (!Sync.ready) return null;
    try {
      const { data, error } = await Sync.client.from("sessions")
        .insert({ profile_id: Sync.profileId, mode }).select("id").single();
      if (error) throw error;
      return data.id;
    } catch (e) { console.warn("[LexisSync] startSession:", e.message); return null; }
  };

  Sync.recordResponse = function (r) {
    // se encola siempre; flush() la enviará (ahora o al recuperar conexión)
    const q = loadQueue();
    q.push({ profile_id: Sync.profileId, ...r });
    saveQueue(q);
    flush();
  };

  Sync.endSession = async function (sessionId, fields) {
    if (!Sync.ready || !sessionId) return;
    try {
      await Sync.client.from("sessions").update({ ended_at: new Date().toISOString(), ...fields }).eq("id", sessionId);
    } catch (e) { console.warn("[LexisSync] endSession:", e.message); }
  };

  Sync.saveProgress = async function (p) {
    if (!Sync.ready) return;
    try {
      await Sync.client.from("progress").upsert({
        profile_id: Sync.profileId,
        last_theta: p.theta, last_cefr: p.cefr, weak_words: p.weak || [],
        updated_at: new Date().toISOString(),
      });
    } catch (e) { console.warn("[LexisSync] saveProgress:", e.message); }
  };

  Sync.loadProgress = async function () {
    if (!Sync.ready) return null;
    try {
      const { data } = await Sync.client.from("progress").select("*").eq("profile_id", Sync.profileId).maybeSingle();
      if (!data) return null;
      return { theta: data.last_theta, cefr: data.last_cefr, weak: data.weak_words || [] };
    } catch (e) { console.warn("[LexisSync] loadProgress:", e.message); return null; }
  };

  async function flush() {
    if (!Sync.ready || !navigator.onLine) return;
    let q = loadQueue();
    if (!q.length) return;
    try {
      const { error } = await Sync.client.from("responses").insert(q);
      if (error) throw error;
      saveQueue([]);                       // enviadas con éxito
    } catch (e) {
      console.warn("[LexisSync] flush diferido:", e.message);  // se reintentará
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Sync.init);
  else Sync.init();
})();
