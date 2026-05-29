/* ============================================================
   parcours.js — Shared logic for all Parcours B1 leçons
   Reads <body data-lecon="N"> to scope localStorage.
   ============================================================ */

(function(){
  'use strict';

  const STATE_KEY     = 'parcours_b1_state';
  const SCORES_KEY    = 'parcours_b1_scores';
  const DRAFTS_KEY    = 'parcours_b1_drafts';
  const PE_KEY        = 'parcours_b1_pe_done';
  const CHECKLIST_KEY = 'parcours_b1_checklist';
  const leconId       = document.body.dataset.lecon;

  // ─────────────── Storage helpers ───────────────
  function loadJSON(key){
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }
  function saveJSON(key, obj){ localStorage.setItem(key, JSON.stringify(obj)); }

  function loadState(){ return loadJSON(STATE_KEY); }
  function saveState(s){ saveJSON(STATE_KEY, s); }
  function loadScores(){ return loadJSON(SCORES_KEY); }

  function saveExoScore(exoId, score, total){
    if (!leconId) return;
    const all = loadScores();
    if (!all[leconId]) all[leconId] = {};
    const prev = all[leconId][exoId];
    const pct = total > 0 ? score / total : 0;
    const prevPct = prev && prev.total > 0 ? prev.score / prev.total : -1;
    if (!prev || pct >= prevPct) {
      all[leconId][exoId] = { score, total, ts: Date.now() };
      saveJSON(SCORES_KEY, all);
      if (window.parcoursCloud) window.parcoursCloud.notify();
    }
  }
  function getExoScore(exoId){
    if (!leconId) return null;
    const all = loadScores();
    return (all[leconId] && all[leconId][exoId]) || null;
  }

  // Count items per exercise type (for the total in score display)
  function countItems(exo){
    const t = exo.dataset.exo;
    const map = {
      'qcm-vocab': '.qcm-q',
      'qcm-read':  '.qcm-q',
      'qcm-read2': '.qcm-q',
      'qcm-co':    '.qcm-q',
      'gap-rel':   '.gap-q',
      'tf':        '.tf-q',
      'tf-delf':   '.tf-q',
      'tf-quiz':   '.tf-q',
      'match':     '.match-item[data-side="L"]',
      'trans':     '.trans-q',
      'order':     '.order-q',
      'type':      '.type-q',
      'prod':      '.gap-input'
    };
    return exo.querySelectorAll(map[t] || '*').length;
  }

  // Drafts (textareas) — saved per leçon + exo id
  function loadDrafts(){
    try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveDraft(exoId, text){
    if (!leconId) return;
    const all = loadDrafts();
    if (!all[leconId]) all[leconId] = {};
    all[leconId][exoId] = text;
    saveJSON(DRAFTS_KEY, all);
    if (window.parcoursCloud) window.parcoursCloud.notify();
  }
  function getDraft(exoId){
    if (!leconId) return '';
    const all = loadDrafts();
    return (all[leconId] && all[leconId][exoId]) || '';
  }

  function paintScoreFromStorage(exo){
    const id    = exo.dataset.exo;
    const total = countItems(exo);
    const saved = getExoScore(id);
    const el    = exo.querySelector('[data-score]');
    if (!el) return;
    if (saved) {
      el.innerHTML = '<strong>' + saved.score + '</strong> / ' + saved.total +
                     ' <span class="best">· mejor guardado</span>';
    } else {
      el.textContent = '0 / ' + total;
    }
  }

  function updateScoreDisplay(exo, score, total){
    const el = exo.querySelector('[data-score]');
    if (el) el.innerHTML = '<strong>' + score + '</strong> / ' + total;
  }

  // ─────────────── TABS ───────────────
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const target = document.querySelector('.panel[data-panel="' + t.dataset.tab + '"]');
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  // ─────────────── FLASHCARDS ───────────────
  document.querySelectorAll('.vocab-item').forEach(card => {
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    if (!card.hasAttribute('role'))     card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Voltear tarjeta');
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        card.classList.toggle('flipped');
      }
    });
  });
  document.querySelectorAll('[data-action="flip-all"]').forEach(b =>
    b.addEventListener('click', () => {
      b.closest('.section').querySelectorAll('.vocab-item').forEach(c => c.classList.add('flipped'));
    }));
  document.querySelectorAll('[data-action="unflip-all"]').forEach(b =>
    b.addEventListener('click', () => {
      b.closest('.section').querySelectorAll('.vocab-item').forEach(c => c.classList.remove('flipped'));
    }));

  // ─────────────── Empty-input warning ───────────────
  function ensureWarn(exo){
    let w = exo.querySelector('.exo-warn');
    if (!w) {
      w = document.createElement('div');
      w.className = 'exo-warn';
      w.textContent = 'Completa todos los huecos antes de comprobar.';
      const actions = exo.querySelector('.exo-actions');
      actions.parentNode.insertBefore(w, actions);
    }
    return w;
  }
  function hasEmpty(inputs){
    return Array.from(inputs).some(i => !i.value.trim());
  }
  function flashWarn(exo){
    const w = ensureWarn(exo);
    w.classList.add('show');
    setTimeout(() => w.classList.remove('show'), 2600);
  }

  // ─────────────── Normalizers ───────────────
  function normGap(s){
    return (s || '').trim().toLowerCase().replace(/\s+/g, '');
  }
  function normLoose(s){
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,;:!?"«»]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // ─────────────── QCM ───────────────
  document.querySelectorAll('.exo[data-exo="qcm-vocab"] .qcm-q, .exo[data-exo="qcm-read"] .qcm-q, .exo[data-exo="qcm-read2"] .qcm-q, .exo[data-exo="qcm-co"] .qcm-q').forEach(q => {
    q.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        if (q.classList.contains('checked')) return;
        q.querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  });
  function checkQCM(exo){
    let score = 0, total = 0;
    exo.querySelectorAll('.qcm-q').forEach(q => {
      total++;
      const correct = +q.dataset.correct;
      const sel     = q.querySelector('.opt.selected');
      q.classList.add('checked');
      q.querySelectorAll('.opt').forEach((o, i) => {
        o.classList.add('locked');
        if (i === correct) o.classList.add('correct');
        else if (o === sel) o.classList.add('incorrect');
      });
      const fbOk = q.querySelector('.feedback.ok');
      const fbKo = q.querySelector('.feedback.ko');
      if (sel && +sel.dataset.i === correct) {
        score++; fbOk && (fbOk.style.display = 'block'); fbKo && (fbKo.style.display = 'none');
      } else {
        fbOk && (fbOk.style.display = 'none'); fbKo && (fbKo.style.display = 'block');
      }
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetQCM(exo){
    exo.querySelectorAll('.qcm-q').forEach(q => {
      q.classList.remove('checked');
      q.querySelectorAll('.opt').forEach(o => o.classList.remove('selected','correct','incorrect','locked'));
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── GAP-FILL ───────────────
  function checkGap(exo){
    const inputs = exo.querySelectorAll('.gap-q .gap-input');
    if (hasEmpty(inputs)) { flashWarn(exo); return; }
    let score = 0, total = 0;
    exo.querySelectorAll('.gap-q').forEach(q => {
      total++;
      const expected = normGap(q.dataset.answer);
      const input    = q.querySelector('.gap-input');
      const val      = normGap(input.value);
      q.classList.add('checked');
      input.disabled = true;
      if (val === expected) { input.classList.add('ok'); score++; }
      else input.classList.add('ko');
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetGap(exo){
    exo.querySelectorAll('.gap-q').forEach(q => {
      q.classList.remove('checked');
      const input = q.querySelector('.gap-input');
      input.disabled = false; input.value = ''; input.classList.remove('ok','ko');
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── T/F ───────────────
  document.querySelectorAll('.exo[data-exo="tf"] .tf-q, .exo[data-exo="tf-delf"] .tf-q, .exo[data-exo="tf-quiz"] .tf-q').forEach(q => {
    q.querySelectorAll('.tf-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (q.classList.contains('checked')) return;
        q.querySelectorAll('.tf-btn').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
      });
    });
  });
  function checkTF(exo){
    let score = 0, total = 0;
    exo.querySelectorAll('.tf-q').forEach(q => {
      total++;
      const correct = q.dataset.correct;
      const sel     = q.querySelector('.tf-btn.sel');
      q.classList.add('checked');
      q.querySelectorAll('.tf-btn').forEach(b => {
        if (b.dataset.v === correct) b.classList.add('correct');
        else if (b === sel) b.classList.add('incorrect');
      });
      if (sel && sel.dataset.v === correct) score++;
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetTF(exo){
    exo.querySelectorAll('.tf-q').forEach(q => {
      q.classList.remove('checked');
      q.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('sel','correct','incorrect'));
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── MATCH ───────────────
  document.querySelectorAll('.exo[data-exo="match"]').forEach(exo => {
    let selected = null;
    const total  = exo.querySelectorAll('.match-item[data-side="L"]').length;
    const scoreEl = exo.querySelector('[data-score]');

    function refresh(){
      const matched = exo.querySelectorAll('.match-item.matched[data-side="L"]').length;
      const left    = total - matched;
      if (matched === total) {
        scoreEl.innerHTML = '<strong>' + total + '</strong> / ' + total + ' ✓';
        saveExoScore('match', total, total);
      } else {
        scoreEl.innerHTML = '<strong>' + matched + '</strong> / ' + total +
          ' <span class="best">· faltan ' + left + '</span>';
      }
    }

    exo.querySelectorAll('.match-item').forEach(it => {
      it.addEventListener('click', () => {
        if (it.classList.contains('matched')) return;
        it.classList.remove('wrong');
        if (!selected)            { selected = it; it.classList.add('selected'); return; }
        if (selected === it)      { selected.classList.remove('selected'); selected = null; return; }
        if (selected.dataset.side === it.dataset.side) {
          selected.classList.remove('selected');
          selected = it; it.classList.add('selected');
          return;
        }
        if (selected.dataset.key === it.dataset.key) {
          selected.classList.remove('selected');
          selected.classList.add('matched','just-matched');
          it.classList.add('matched','just-matched');
          const pair = [selected, it];
          setTimeout(() => pair.forEach(x => x.classList.remove('just-matched')), 600);
        } else {
          selected.classList.add('wrong'); it.classList.add('wrong');
          const a = selected, b = it;
          setTimeout(() => {
            a.classList.remove('wrong','selected');
            b.classList.remove('wrong');
            refresh();
          }, 900);
          selected = null;
          return;
        }
        selected = null;
        refresh();
      });
    });

    const resetBtn = exo.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        exo.querySelectorAll('.match-item').forEach(it =>
          it.classList.remove('matched','selected','wrong','just-matched'));
        selected = null;
        // Show saved best after reset
        const saved = getExoScore('match');
        if (saved && saved.score === saved.total) {
          scoreEl.innerHTML = '<strong>' + saved.score + '</strong> / ' + saved.total +
                              ' <span class="best">· mejor guardado</span>';
        } else {
          refresh();
        }
      });
    }

    // Initial render: saved or zero
    const saved = getExoScore('match');
    if (saved) {
      scoreEl.innerHTML = '<strong>' + saved.score + '</strong> / ' + saved.total +
                          ' <span class="best">· mejor guardado</span>';
    } else {
      refresh();
    }
  });

  // ─────────────── TRANSFORMATION ───────────────
  function checkTrans(exo){
    const inputs = exo.querySelectorAll('.trans-q .trans-input');
    if (hasEmpty(inputs)) { flashWarn(exo); return; }
    let score = 0, total = 0;
    exo.querySelectorAll('.trans-q').forEach(q => {
      total++;
      const expected = normLoose(q.dataset.answer);
      const input    = q.querySelector('.trans-input');
      const val      = normLoose(input.value);
      q.classList.add('checked');
      input.disabled = true;
      if (val === expected) { input.classList.add('ok'); score++; }
      else input.classList.add('ko');
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetTrans(exo){
    exo.querySelectorAll('.trans-q').forEach(q => {
      q.classList.remove('checked');
      const input = q.querySelector('.trans-input');
      input.disabled = false; input.value = ''; input.classList.remove('ok','ko');
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── WORD ORDER ───────────────
  document.querySelectorAll('.exo[data-exo="order"] .order-q').forEach(q => {
    const bank   = q.querySelector('[data-bank]');
    const target = q.querySelector('[data-target]');
    bank.querySelectorAll('.word').forEach(w => {
      w.addEventListener('click', () => target.appendChild(w));
    });
    target.addEventListener('click', e => {
      if (e.target.classList.contains('word')) bank.appendChild(e.target);
    });
  });
  function checkOrder(exo){
    let score = 0, total = 0;
    exo.querySelectorAll('.order-q').forEach(q => {
      total++;
      const target = q.querySelector('[data-target]');
      const got      = normLoose(Array.from(target.querySelectorAll('.word')).map(w => w.textContent).join(' '));
      const expected = normLoose(q.dataset.solution);
      q.classList.remove('ok','ko');
      if (got === expected) { q.classList.add('ok'); score++; }
      else q.classList.add('ko');
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetOrder(exo){
    exo.querySelectorAll('.order-q').forEach(q => {
      q.classList.remove('ok','ko');
      const bank = q.querySelector('[data-bank]');
      q.querySelectorAll('[data-target] .word').forEach(w => bank.appendChild(w));
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── TYPING ───────────────
  function checkType(exo){
    const inputs = exo.querySelectorAll('.type-q .type-input');
    if (hasEmpty(inputs)) { flashWarn(exo); return; }
    let score = 0, total = 0;
    exo.querySelectorAll('.type-q').forEach(q => {
      total++;
      const expected = normLoose(q.dataset.answer);
      const input    = q.querySelector('.type-input');
      const val      = normLoose(input.value);
      q.classList.add('checked');
      input.disabled = true;
      if (val === expected) { input.classList.add('ok'); score++; }
      else input.classList.add('ko');
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetType(exo){
    exo.querySelectorAll('.type-q').forEach(q => {
      q.classList.remove('checked');
      const input = q.querySelector('.type-input');
      input.disabled = false; input.value = ''; input.classList.remove('ok','ko');
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── PROD (mini-conversation) ───────────────
  function checkProd(exo){
    const inputs = exo.querySelectorAll('.gap-input');
    if (hasEmpty(inputs)) { flashWarn(exo); return; }
    let score = 0, total = 0;
    inputs.forEach(input => {
      total++;
      const expected = normGap(input.dataset.answer);
      const val      = normGap(input.value);
      input.disabled = true;
      if (val === expected) { input.classList.add('ok'); score++; }
      else input.classList.add('ko');
    });
    updateScoreDisplay(exo, score, total);
    saveExoScore(exo.dataset.exo, score, total);
  }
  function resetProd(exo){
    exo.querySelectorAll('.gap-input').forEach(input => {
      input.disabled = false; input.value = ''; input.classList.remove('ok','ko');
    });
    paintScoreFromStorage(exo);
  }

  // ─────────────── PE PROMPTS (4 enunciados, toggle done) ───────────────
  function loadPEDone(){
    try { return JSON.parse(localStorage.getItem(PE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function isPEDone(promptId){
    if (!leconId) return false;
    const all = loadPEDone();
    return !!(all[leconId] && all[leconId].includes(promptId));
  }
  function togglePEDone(promptId){
    if (!leconId) return false;
    const all = loadPEDone();
    if (!all[leconId]) all[leconId] = [];
    const idx = all[leconId].indexOf(promptId);
    if (idx === -1) all[leconId].push(promptId);
    else all[leconId].splice(idx, 1);
    saveJSON(PE_KEY, all);
    if (window.parcoursCloud) window.parcoursCloud.notify();
    return idx === -1; // returns new state
  }
  document.querySelectorAll('.pe-prompt').forEach(p => {
    const id = p.dataset.peId;
    if (!id) return;
    if (isPEDone(id)) p.classList.add('done');
    const btn = p.querySelector('.pe-check');
    if (btn) {
      btn.addEventListener('click', () => {
        const done = togglePEDone(id);
        p.classList.toggle('done', done);
        const label = btn.querySelector('.check-label');
        if (label) label.textContent = done ? 'Fait' : 'Marquer comme fait';
      });
    }
  });

  // ─────────────── CHECKLIST autoevaluación ───────────────
  function loadChecklist(){
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function isCheckedItem(idx){
    if (!leconId) return false;
    const all = loadChecklist();
    return !!(all[leconId] && all[leconId].includes(idx));
  }
  function toggleChecklistItem(idx){
    if (!leconId) return false;
    const all = loadChecklist();
    if (!all[leconId]) all[leconId] = [];
    const i = all[leconId].indexOf(idx);
    if (i === -1) all[leconId].push(idx);
    else all[leconId].splice(i, 1);
    saveJSON(CHECKLIST_KEY, all);
    if (window.parcoursCloud) window.parcoursCloud.notify();
    return i === -1;
  }
  document.querySelectorAll('.checklist').forEach(cl => {
    const items = cl.querySelectorAll('li');
    const bar   = cl.querySelector('.ch-fill');
    const pct   = cl.querySelector('.ch-pct');
    const prog  = cl.querySelector('.checklist-progress');
    function refreshProg(){
      const total = items.length;
      const done  = cl.querySelectorAll('li.checked').length;
      const p = total > 0 ? Math.round(done / total * 100) : 0;
      if (bar) bar.style.width = p + '%';
      if (pct) pct.innerHTML = '<strong>' + done + '</strong> / ' + total;
      if (prog) prog.classList.toggle('full', done === total);
    }
    items.forEach((li, idx) => {
      if (isCheckedItem(idx)) li.classList.add('checked');
      li.addEventListener('click', () => {
        const on = toggleChecklistItem(idx);
        li.classList.toggle('checked', on);
        refreshProg();
      });
    });
    refreshProg();
  });

  // ─────────────── FREE PRODUCTION (textarea) ───────────────
  function wireFreeProd(exo){
    const ta = exo.querySelector('textarea.free-text');
    if (!ta) return;
    const wcEl    = exo.querySelector('.word-count');
    const savedEl = exo.querySelector('.draft-saved');
    const target    = +(exo.dataset.target    || 60);
    const targetMax = +(exo.dataset.targetMax || 80);
    const exoKey    = exo.dataset.exo;

    // Restore
    const draft = getDraft(exoKey);
    if (draft) ta.value = draft;

    function refreshWord(){
      const raw = (ta.value || '').trim();
      const n = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
      if (wcEl) {
        wcEl.textContent = n + ' mot' + (n === 1 ? '' : 's');
        wcEl.classList.toggle('target-met',  n >= target && n <= targetMax);
        wcEl.classList.toggle('target-over', n > targetMax);
      }
    }
    let t = null;
    function showSaved(){ if (savedEl) { savedEl.textContent = '✓ Brouillon sauvegardé'; setTimeout(()=>{ if (savedEl.textContent.startsWith('✓')) savedEl.textContent=''; }, 1800); } }
    ta.addEventListener('input', () => {
      refreshWord();
      if (t) clearTimeout(t);
      t = setTimeout(() => { saveDraft(exoKey, ta.value); showSaved(); }, 700);
    });
    refreshWord();

    // Reset button (if any) clears draft
    const resetBtn = exo.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        ta.value = '';
        saveDraft(exoKey, '');
        refreshWord();
      });
    }
  }
  document.querySelectorAll('.exo[data-exo="prod-libre"]').forEach(wireFreeProd);

  // ─────────────── Wire all exercises ───────────────
  const checkers = {
    'qcm-vocab': checkQCM, 'qcm-read': checkQCM, 'qcm-read2': checkQCM, 'qcm-co': checkQCM,
    'gap-rel': checkGap, 'tf': checkTF, 'tf-delf': checkTF, 'tf-quiz': checkTF,
    'trans': checkTrans, 'order': checkOrder, 'type': checkType, 'prod': checkProd
  };
  const resetters = {
    'qcm-vocab': resetQCM, 'qcm-read': resetQCM, 'qcm-read2': resetQCM, 'qcm-co': resetQCM,
    'gap-rel': resetGap, 'tf': resetTF, 'tf-delf': resetTF, 'tf-quiz': resetTF,
    'trans': resetTrans, 'order': resetOrder, 'type': resetType, 'prod': resetProd
  };

  document.querySelectorAll('.exo').forEach(exo => {
    const type  = exo.dataset.exo;
    const check = exo.querySelector('[data-check]');
    const reset = exo.querySelector('[data-reset]');
    if (check && checkers[type])  check.addEventListener('click', () => checkers[type](exo));
    if (reset && resetters[type]) reset.addEventListener('click', () => resetters[type](exo));

    // Enter on any input triggers Comprobar
    exo.querySelectorAll('input[type="text"]').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          check && check.click();
        }
      });
    });

    // Paint saved score on load (match handles its own; reading/prod-libre have no score)
    if (type !== 'match' && type !== 'prod-libre' && type !== 'reading') paintScoreFromStorage(exo);
  });

  // ─────────────── MARK AS DONE ───────────────
  const markBtn = document.getElementById('mark-done');
  if (markBtn && leconId) {
    const id = +leconId;
    function paintMark(){
      const state = loadState();
      const done  = state.done || [];
      if (done.includes(id)) {
        markBtn.textContent = '✓ Marcada como completada';
        markBtn.disabled    = true;
        markBtn.style.opacity = '.85';
      }
    }
    paintMark();
    markBtn.addEventListener('click', () => {
      const state = loadState();
      state.done = state.done || [];
      if (!state.done.includes(id)) state.done.push(id);
      saveState(state);
      paintMark();
      if (window.parcoursCloud) window.parcoursCloud.notify();
    });
  }

  // Re-paint everything when cloud finishes loading remote state
  window.addEventListener('parcours:cloud-loaded', () => {
    document.querySelectorAll('.exo').forEach(exo => {
      const t = exo.dataset.exo;
      if (t !== 'match' && t !== 'prod-libre' && t !== 'reading') paintScoreFromStorage(exo);
    });
    // Restore textarea drafts
    document.querySelectorAll('.exo[data-exo="prod-libre"]').forEach(exo => {
      const ta = exo.querySelector('textarea.free-text');
      if (!ta) return;
      const draft = getDraft(exo.dataset.exo);
      ta.value = draft || '';
      ta.dispatchEvent(new Event('input'));
    });
    // Restore PE prompts done state
    document.querySelectorAll('.pe-prompt').forEach(p => {
      const id = p.dataset.peId;
      p.classList.toggle('done', isPEDone(id));
    });
    // Restore checklist
    document.querySelectorAll('.checklist').forEach(cl => {
      const items = cl.querySelectorAll('li');
      items.forEach((li, idx) => li.classList.toggle('checked', isCheckedItem(idx)));
      const bar = cl.querySelector('.ch-fill');
      const pct = cl.querySelector('.ch-pct');
      const prog = cl.querySelector('.checklist-progress');
      const total = items.length;
      const done  = cl.querySelectorAll('li.checked').length;
      const p = total > 0 ? Math.round(done / total * 100) : 0;
      if (bar) bar.style.width = p + '%';
      if (pct) pct.innerHTML = '<strong>' + done + '</strong> / ' + total;
      if (prog) prog.classList.toggle('full', done === total);
    });
    // Refresh "mark as done" button
    if (markBtn && leconId) {
      const state = loadState();
      const done  = state.done || [];
      if (done.includes(+leconId)) {
        markBtn.textContent = '✓ Marcada como completada';
        markBtn.disabled    = true;
        markBtn.style.opacity = '.85';
      } else {
        markBtn.textContent = 'Marcar como completada';
        markBtn.disabled    = false;
        markBtn.style.opacity = '';
      }
    }
  });
})();

/* ═══════════════════════════════════════════════════════════════
   SUPABASE CLOUD SYNC MODULE (parcours_b1)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  const APP_ID       = 'parcours_b1';
  const SUPABASE_URL = 'https://fwnhszukuopcrajfbsab.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bmhzenVrdW9wY3JhamZic2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzU2ODYsImV4cCI6MjA5NTU1MTY4Nn0.FYjkiUQ9kkYtHVCpejB7xX4mG45O1cuTOte5eN6btHk';
  const PROFILES      = ['ruben', 'sergio', 'invitado'];
  const PROFILE_LABEL = { ruben:'Rubén', sergio:'Sergio', invitado:'Invitado' };
  const PROFILE_INIT  = { ruben:'R',     sergio:'S',      invitado:'I' };
  const SAVE_DEBOUNCE = 1500;

  const LS_PROFILE   = 'delf_active_profile';
  const LS_STATE     = 'parcours_b1_state';
  const LS_SCORES    = 'parcours_b1_scores';
  const LS_DRAFTS    = 'parcours_b1_drafts';
  const LS_PE        = 'parcours_b1_pe_done';
  const LS_CHECKLIST = 'parcours_b1_checklist';
  const LS_ACTIVITY  = 'parcours_b1_activity';
  const LS_SRS       = 'parcours_b1_srs';
  function LS_BACKUP(p){ return 'parcours_cloud_backup__' + APP_ID + '__' + p; }

  const CLOUD_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

  let activeProfile = null;
  let saveTimer = null;
  let hideTimer = null;
  let statusEl = null;

  // ─── helpers ───
  function loadKey(k){
    try { return JSON.parse(localStorage.getItem(k) || '{}'); }
    catch (e) { return {}; }
  }
  function readGlobals(){
    return {
      state:     loadKey(LS_STATE),
      scores:    loadKey(LS_SCORES),
      drafts:    loadKey(LS_DRAFTS),
      peDone:    loadKey(LS_PE),
      checklist: loadKey(LS_CHECKLIST),
      activity:  loadKey(LS_ACTIVITY),
      srs:       loadKey(LS_SRS)
    };
  }
  function applyPayload(data){
    if (!data || typeof data !== 'object') data = {};
    try { localStorage.setItem(LS_STATE,     JSON.stringify(data.state     || {})); } catch (e){}
    try { localStorage.setItem(LS_SCORES,    JSON.stringify(data.scores    || {})); } catch (e){}
    try { localStorage.setItem(LS_DRAFTS,    JSON.stringify(data.drafts    || {})); } catch (e){}
    try { localStorage.setItem(LS_PE,        JSON.stringify(data.peDone    || {})); } catch (e){}
    try { localStorage.setItem(LS_CHECKLIST, JSON.stringify(data.checklist || {})); } catch (e){}
    try { localStorage.setItem(LS_ACTIVITY,  JSON.stringify(data.activity  || {})); } catch (e){}
    try { localStorage.setItem(LS_SRS,       JSON.stringify(data.srs       || {})); } catch (e){}
    window.dispatchEvent(new CustomEvent('parcours:cloud-loaded', { detail: data }));
  }
  function isEmpty(p){
    if (!p) return true;
    const s  = p.state || {}, sc = p.scores || {}, d = p.drafts || {},
          pe = p.peDone || {}, cl = p.checklist || {}, ac = p.activity || {}, sr = p.srs || {};
    if (Array.isArray(s.done) && s.done.length) return false;
    if (Object.keys(sc).length) return false;
    if (Object.keys(d).length)  return false;
    if (Object.keys(pe).length) return false;
    if (Object.keys(cl).length) return false;
    if (Object.keys(ac).length) return false;
    if (Object.keys(sr).length) return false;
    return true;
  }

  // ─── status indicator ───
  function setStatus(kind, text, autohide){
    if (!statusEl) statusEl = document.getElementById('cloudStatus');
    if (!statusEl) return;
    statusEl.classList.remove('saving','saved','offline','error');
    if (kind) statusEl.classList.add(kind);
    const txt = statusEl.querySelector('.cs-text');
    if (txt) txt.textContent = text;
    statusEl.classList.add('visible');
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (autohide) {
      hideTimer = setTimeout(() => statusEl.classList.remove('visible'), autohide);
    }
  }

  // ─── profile pill ───
  function updateProfilePill(){
    const pill   = document.getElementById('hdrProfilePill');
    const avatar = document.getElementById('hdrProfileAvatar');
    const name   = document.getElementById('hdrProfileName');
    if (!pill || !avatar || !name) return;
    const p = activeProfile || 'invitado';
    pill.setAttribute('data-profile', p);
    avatar.textContent = PROFILE_INIT[p] || '?';
    name.textContent   = PROFILE_LABEL[p] || p;
  }

  // ─── Supabase I/O ───
  function cloudKey(profile){ return APP_ID + '_' + profile; }

  function cloudLoad(profile){
    if (!CLOUD_ENABLED) return Promise.reject(new Error('cloud-disabled'));
    const url = SUPABASE_URL.replace(/\/$/, '') +
                '/rest/v1/progress?user_id=eq.' + encodeURIComponent(cloudKey(profile)) +
                '&select=data';
    return fetch(url, {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        Accept:        'application/json'
      }
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(rows => (Array.isArray(rows) && rows.length > 0) ? (rows[0].data || {}) : null);
  }

  function cloudSave(profile, payload){
    if (!CLOUD_ENABLED) return Promise.reject(new Error('cloud-disabled'));
    const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/progress?on_conflict=user_id';
    return fetch(url, {
      method: 'POST',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id:    cloudKey(profile),
        data:       payload,
        updated_at: new Date().toISOString()
      })
    }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); });
  }

  // ─── save pipeline ───
  function persistLocalBackup(profile, payload){
    try { localStorage.setItem(LS_BACKUP(profile), JSON.stringify(payload)); } catch (e){}
  }
  function readLocalBackup(profile){
    try {
      const s = localStorage.getItem(LS_BACKUP(profile));
      return s ? JSON.parse(s) : null;
    } catch (e){ return null; }
  }

  function doSaveNow(){
    if (!activeProfile) return;
    const payload = readGlobals();
    persistLocalBackup(activeProfile, payload);
    if (!CLOUD_ENABLED) { setStatus('offline', '⚠ Sin nube', 2500); return; }
    if (!navigator.onLine) { setStatus('offline', '⚠ Sin conexión — guardado local', 3000); return; }
    setStatus('saving', '☁ Guardando…', 0);
    cloudSave(activeProfile, payload)
      .then(() => setStatus('saved', '✓ Guardado', 1800))
      .catch(err => {
        console.warn('[parcoursCloud] save', err);
        setStatus('offline', '⚠ Sin conexión — guardado local', 3500);
      });
  }
  function scheduleSave(){
    if (!activeProfile) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; doSaveNow(); }, SAVE_DEBOUNCE);
  }

  // ─── load profile data ───
  function loadProfileData(profile){
    setStatus('saving', '☁ Cargando perfil…', 0);
    const embedded    = readGlobals();
    const localBackup = readLocalBackup(profile);

    function offlineFallback(){
      const pick = (localBackup && !isEmpty(localBackup)) ? localBackup : embedded;
      applyPayload(pick);
    }
    if (!CLOUD_ENABLED || !navigator.onLine) {
      offlineFallback();
      setStatus('offline', '⚠ Modo local', 2500);
      return;
    }
    cloudLoad(profile).then(remote => {
      if (remote === null) {
        // First time for this profile → seed cloud with embedded state
        applyPayload(embedded);
        persistLocalBackup(profile, embedded);
        setStatus('saved', '✓ Perfil nuevo', 2400);
        if (!isEmpty(embedded)) scheduleSave();
        return;
      }
      applyPayload(remote);
      persistLocalBackup(profile, remote);
      setStatus('saved', '✓ Perfil cargado', 1800);
    }).catch(err => {
      console.warn('[parcoursCloud] load', err);
      offlineFallback();
      setStatus('offline', '⚠ Sin conexión — local', 3000);
    });
  }

  // ─── profile pill click → back to main index ───
  function wirePill(){
    const pill = document.getElementById('hdrProfilePill');
    if (!pill) return;
    pill.title = 'Cambiar perfil (vuelve al índice)';
    pill.addEventListener('click', () => {
      const here = window.location.pathname + window.location.search + window.location.hash;
      // From frances/Parcours/* we need to climb two levels.
      window.location.href = '../../index.html?return=' + encodeURIComponent(here);
    });
  }

  // ─── lifecycle hooks ───
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) {
      clearTimeout(saveTimer); saveTimer = null;
      doSaveNow();
    }
  });
  window.addEventListener('online',  () => { setStatus('saved', '✓ Conectado', 1800); doSaveNow(); });
  window.addEventListener('offline', () => setStatus('offline', '⚠ Sin conexión', 0));

  // ─── public API for other scripts ───
  window.parcoursCloud = {
    notify:  scheduleSave,
    profile: () => activeProfile
  };

  // ─── boot ───
  function boot(){
    wirePill();
    let saved = null;
    try { saved = localStorage.getItem(LS_PROFILE); } catch (e){}
    if (saved && PROFILES.indexOf(saved) !== -1) {
      activeProfile = saved;
      updateProfilePill();
      loadProfileData(saved);
    } else {
      // No profile chosen → main index will ask for one and bring us back
      setStatus('offline', 'Elige un perfil en el índice', 0);
      const here = window.location.pathname + window.location.search + window.location.hash;
      setTimeout(() => window.location.replace('../../index.html?return=' + encodeURIComponent(here)), 700);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();

/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE — modo oscuro persistente
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const LS_THEME = 'parcours_theme';
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
  }
  let saved = 'light';
  try { saved = localStorage.getItem(LS_THEME) || 'light'; } catch(e){}
  applyTheme(saved);

  function ensureToggle(){
    // Insertar el botón dentro de hdr-profile-row, antes de la pill
    const row = document.querySelector('.hdr-profile-row');
    if (!row || row.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.title = 'Cambiar tema (claro / oscuro)';
    btn.setAttribute('aria-label', 'Cambiar tema');
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(LS_THEME, next); } catch(e){}
    });
    row.insertBefore(btn, row.firstChild);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureToggle);
  } else {
    ensureToggle();
  }
})();
