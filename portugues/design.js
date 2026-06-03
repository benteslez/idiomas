/* ============================================================
   _design.js — Shared behaviors for `frances/` grammar pages
   - Theme (light/dark) with persistence
   - Font-size slider
   - Section navigation + sticky nav scroll indicator
   - Keyboard nav (←/→) between sections
   - Hash routing (#s-id) for shareable links
   - Mode toggle (Referencia / Ejercicios)
   - Chip group selector
   Page-specific code (data, renderers, exercise generators) stays
   inline in each page.
   ============================================================ */

/* ==== THEME ==== */
(function initTheme() {
  function apply(t) { document.documentElement.setAttribute("data-theme", t); }
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "dark" || saved === "light") { apply(saved); return; }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(prefersDark ? "dark" : "light");
})();

window.applyTheme = function (t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch (e) {}
};
window.toggleTheme = function () {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  window.applyTheme(cur === "dark" ? "light" : "dark");
};

/* ==== FONT SIZE ==== */
window.setFontSize = function (v) {
  document.documentElement.style.setProperty("--fs", v + "px");
};

/* ==== SECTION NAV ==== */
function getSectionIds() {
  return Array.from(document.querySelectorAll(".sec-block")).map(s => s.id).filter(Boolean);
}

window.showSection = function (id, btn, opts) {
  opts = opts || {};
  document.querySelectorAll(".sec-block").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".snav-btn").forEach(b => b.classList.remove("active"));
  const sec = document.getElementById(id);
  if (!sec) return;
  sec.classList.add("active");
  if (!btn) btn = document.querySelector(`.snav-btn[onclick*="'${id}'"]`);
  if (btn) {
    btn.classList.add("active");
    btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  if (!opts.skipHash) {
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
  }
  if (!opts.skipScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  requestAnimationFrame(updateScrollProgress);
};

/* ==== MODE TOGGLE (Referencia / Ejercicios) ==== */
window.switchMode = function (mode, btn) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  const panel = document.getElementById("panel-" + mode);
  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");
  const nav = document.getElementById("section-nav");
  if (nav) nav.style.display = mode === "ref" ? "" : "none";
  requestAnimationFrame(updateScrollProgress);
};

/* ==== CHIPS ==== */
window.selectChip = function (ns, idx) {
  document.querySelectorAll(".chip-bar").forEach(bar => {
    const first = bar.querySelector(".chip");
    if (first && first.getAttribute("onclick") && first.getAttribute("onclick").includes("'" + ns + "'")) {
      bar.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === idx));
    }
  });
  const panelsEl = document.getElementById(ns + "-panels");
  if (panelsEl) panelsEl.querySelectorAll(":scope > .chip-panel").forEach((p, i) => p.classList.toggle("active", i === idx));
};

/* ==== SCROLL PROGRESS ==== */
let _rafProg = null;
function updateScrollProgress() {
  _rafProg = null;
  const active = document.querySelector(".sec-block.active");
  const fill = document.getElementById("scroll-progress-fill");
  if (!active || !fill) return;
  const nav = document.getElementById("section-nav");
  const navH = nav ? nav.offsetHeight : 0;
  const rect = active.getBoundingClientRect();
  const viewH = window.innerHeight;
  const scrollable = active.offsetHeight - (viewH - navH);
  if (scrollable <= 24) { fill.style.width = "100%"; return; }
  const scrolled = Math.max(0, navH - rect.top);
  const pct = Math.min(100, Math.max(0, (scrolled / scrollable) * 100));
  fill.style.width = pct + "%";
}
window.updateScrollProgress = updateScrollProgress;
function onScrollProg() {
  if (_rafProg) return;
  _rafProg = requestAnimationFrame(updateScrollProgress);
}
window.addEventListener("scroll", onScrollProg, { passive: true });
window.addEventListener("resize", onScrollProg, { passive: true });

/* ==== KEYBOARD NAV ==== */
window.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const t = document.activeElement;
  if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const btns = Array.from(document.querySelectorAll(".snav-btn"));
  const idx = btns.findIndex(b => b.classList.contains("active"));
  if (idx === -1) return;
  const next = e.key === "ArrowLeft"
    ? (idx - 1 + btns.length) % btns.length
    : (idx + 1) % btns.length;
  btns[next].click();
  e.preventDefault();
});

/* ==== HASH ROUTING ==== */
function routeFromHash() {
  const h = (window.location.hash || "").replace(/^#/, "");
  const ids = getSectionIds();
  if (ids.includes(h)) {
    window.showSection(h, null, { skipHash: true });
  }
}
window.routeFromHash = routeFromHash;
window.addEventListener("hashchange", routeFromHash);

/* ==== INIT ==== */
function initDesign() {
  routeFromHash();
  requestAnimationFrame(updateScrollProgress);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDesign);
} else {
  initDesign();
}
