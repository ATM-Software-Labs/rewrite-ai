/* Rewrite · ATM Software Labs — interfaz y sesión compartida con *.trujillomingorance.com */
(function () {
  'use strict';
  var T = window.rwT || function (k) { return k; };
  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastTimer;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600); }

  /* Tema: sistema por defecto; el botón lo fija */
  $('theme-btn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); store('ta_theme', next);
  });
  try {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
      if (!store('ta_theme')) document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
    });
  } catch (e) {}

  /* Sesión */
  var returnTo = location.origin + '/';
  $('btnX').href = '/api/auth/x?returnTo=' + encodeURIComponent(returnTo);
  $('btnGoogle').href = '/api/auth/google?returnTo=' + encodeURIComponent(returnTo);
  var modal = $('authModal');
  function openAuth() { modal.hidden = false; setTimeout(function () { $('btnX').focus(); }, 30); }
  function closeAuth() { modal.hidden = true; }
  modal.addEventListener('click', function (e) { if (e.target === modal) closeAuth(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAuth(); closeMenu(); } });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-auth]')) openAuth();
    if (e.target.closest('[data-close-auth]')) closeAuth();
    if (e.target.closest('[data-logout]')) logout();
    var wrap = $('account-wrap');
    if (wrap && !wrap.contains(e.target)) closeMenu();
  });
  function closeMenu() { var m = $('account-menu'); if (m) { m.hidden = true; $('account-btn').setAttribute('aria-expanded', 'false'); } }
  function initials(n) { return (String(n || '?').trim().split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2) || '?').toUpperCase(); }

  function paint(me) {
    var slot = $('account-slot');
    if (!me) { slot.innerHTML = '<button type="button" class="btn btn-primary btn-sm" data-open-auth>' + T('login') + '</button>'; return; }
    var name = me.name || me.username || me.handle || (me.email ? me.email.split('@')[0] : 'Usuario');
    var handle = String(me.handle || me.username || '').replace(/^@+/, '');
    var pic = me.avatar || me.picture || me.profile_image_url || '';
    var photo = pic ? '<img class="account-photo" src="' + esc(pic) + '" alt="" width="28" height="28" referrerpolicy="no-referrer">' : '<span class="account-photo">' + esc(initials(name)) + '</span>';
    slot.innerHTML = '<div class="account-wrap" id="account-wrap">' +
      '<button type="button" class="account-chip" id="account-btn" aria-haspopup="menu" aria-expanded="false" title="' + esc(name) + '">' + photo +
      '<span class="account-first">' + esc(String(name).split(/\s+/)[0]) + '</span></button>' +
      '<div class="account-menu" id="account-menu" role="menu" hidden>' +
      '<div class="account-menu-head"><strong>' + esc(name) + '</strong><span>' + esc(handle ? '@' + handle : (me.email || '')) + '</span></div>' +
      (handle ? '<a role="menuitem" href="https://guides.trujillomingorance.com/u/@' + encodeURIComponent(handle) + '">' + T('menu_profile') + '</a>' : '') +
      '<a role="menuitem" href="https://guides.trujillomingorance.com/settings">' + T('menu_settings') + '</a>' +
      '<a role="menuitem" href="https://guides.trujillomingorance.com/achievements">' + T('menu_ach') + '</a>' +
      '<a role="menuitem" href="https://trujillomingorance.com/">trujillomingorance.com</a>' +
      '<button type="button" role="menuitem" data-logout>' + T('menu_logout') + '</button></div></div>';
    $('account-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      var m = $('account-menu'); m.hidden = !m.hidden; this.setAttribute('aria-expanded', String(!m.hidden));
    });
  }
  function loadMe() {
    var cached = store('rw_me');
    if (cached) { try { paint(JSON.parse(cached)); } catch (e) {} }
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var me = d && (d.user || (d.authenticated !== false && (d.name || d.handle || d.email) ? d : null));
        if (me) { store('rw_me', JSON.stringify(me)); paint(me); }
        else { store('rw_me', null); paint(null); }
      })
      .catch(function () {});
  }
  function logout() {
    store('rw_me', null); paint(null);
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(function () { toast(T('t_logout')); });
  }
  loadMe();
  var lastMe = null; var _paint = paint; paint = function (me) { lastMe = me; _paint(me); };
  document.addEventListener('rw:lang', function () {
    paint(lastMe); counts(); $('btnRunText').textContent = running ? T('processing') : LABEL[mode];
    if (!$('stats').hidden && lastStats) renderStats(lastStats[0], lastStats[1]);
  });
  if (/[?&](auth|login)=/.test(location.search)) { if (/login/.test(location.search)) openAuth(); history.replaceState({}, '', '/'); }

  /* Espacio de trabajo */
  var mode = 'stealth', running = false;
  var LABEL = { get stealth() { return T('run_rewrite'); }, get corrector() { return T('run_correct'); }, get translate() { return T('run_translate'); }, get audit() { return 'Auditar texto con IA'; }, get sentiment() { return 'Analizar tono y emoción'; }, get hooks() { return 'Generar ganchos virales'; }, get proofread() { return 'Auditar coherencia profunda'; } };
  var tl = store('rw_target'); if (tl) $('targetLang').value = tl;
  $('targetLang').addEventListener('change', function () { store('rw_target', this.value); });
  setTimeout(function () { var m = store('rw_mode'); var b = m && document.querySelector('.seg-btn[data-mode="' + m + '"]'); if (b) b.click(); }, 0);
  var input = $('inputText'), out = $('outputText');
  function words(t) { t = t.trim(); return t ? t.split(/\s+/).length : 0; }
  function counts() {
    var n = words(input.value); $('inWordCount').textContent = n + ' ' + (n === 1 ? T('w1') : T('wN'));
    var o = words(out.textContent); $('outWordCount').textContent = out.hidden ? '' : o + ' ' + (o === 1 ? T('w1') : T('wN'));
  }
  input.value = store('rw_draft') || '';
  input.addEventListener('input', function () { counts(); store('rw_draft', input.value); });
  counts();
  $('btnRunText').textContent = LABEL[mode];
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      document.querySelectorAll('.seg-btn').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
      $('btnRunText').textContent = LABEL[mode];
      $('stylePreset').hidden = mode !== 'stealth';
      $('langPair').hidden = mode !== 'translate';
      store('rw_mode', mode); resetOut();
    });
  });
  function stripMd(t) {
    return String(t || '').replace(/<\/?(texto|text)>/gi, '')
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '').replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[*\-+•]\s+/gm, '').replace(/\*\*/g, '').replace(/__/g, '')
      .replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '');
  }
  function showOut(text, streaming) {
    $('outputEmpty').hidden = true; out.hidden = false; $('btnCopy').hidden = streaming;
    out.textContent = stripMd(text); out.classList.toggle('cursor', !!streaming); counts();
  }
  function resetOut() { $('stats').hidden = true; out.textContent = ''; out.hidden = true; var tr = $('toolResult'); if (tr) { tr.innerHTML = ''; tr.hidden = true; } $('outputEmpty').hidden = false; $('btnCopy').hidden = true; counts(); }
  $('btnClear').addEventListener('click', function () { input.value = ''; store('rw_draft', null); resetOut(); input.focus(); });
  $('btnPaste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { toast(T('t_paste')); return; }
    navigator.clipboard.readText().then(function (t) { if (t) { input.value = t; store('rw_draft', t); counts(); } }).catch(function () { toast(T('t_paste')); });
  });
  $('btnCopy').addEventListener('click', function () {
    var t = out.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast(T('t_copied')); }, function () { toast(T('t_copyfail')); });
  });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });
  $('btnRun').addEventListener('click', run);

  /* Cambios en el estilo: métricas locales y verificables */
  var CLICHES = ['en resumen', 'en conclusión', 'cabe destacar', 'es importante señalar', 'es importante destacar', 'paradoja', 'crucial', 'fundamental', 'en un mundo', 'en el panorama actual', 'a día de hoy', 'no solo', 'sin lugar a dudas', 'un tapiz', 'en definitiva', 'juega un papel', 'in conclusion', 'it is worth noting', 'crucial', 'delve', 'tapestry', 'landscape', 'moreover', 'furthermore', 'in today\'s world', 'paradox'];
  function sentenceStats(t) {
    var plain = stripMd(t).replace(/\n+/g, ' ');
    var sents = plain.split(/(?<=[.!?…])\s+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.split(/\s+/).length > 1; });
    var lens = sents.map(function (x) { return x.split(/\s+/).length; });
    var n = lens.length || 1, mean = lens.reduce(function (a, b) { return a + b; }, 0) / n;
    var sd = Math.sqrt(lens.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / n);
    return { sd: sd, mean: mean, n: lens.length };
  }
  function countCliches(t) {
    var low = ' ' + t.toLowerCase() + ' ', c = 0;
    CLICHES.forEach(function (k) { var i = 0; while ((i = low.indexOf(k, i)) !== -1) { c++; i += k.length; } });
    return c;
  }
  var lastStats = null;
  function renderStats(before, after) {
    lastStats = [before, after];
    var a = sentenceStats(before), b = sentenceStats(after);
    var ca = countCliches(before), cb = countCliches(after);
    var wa = words(stripMd(before)), wb = words(after);
    function f(x) { return x.toFixed(1).replace('.', ','); }
    $('statsGrid').innerHTML =
      '<div class="stat"><div class="stat-label">' + T('st_var') + '</div><div class="stat-value">' + f(a.sd) + ' → ' + f(b.sd) + '</div></div>' +
      '<div class="stat"><div class="stat-label">' + T('st_cli') + '</div><div class="stat-value">' + ca + ' → ' + cb + ' <small>(' + Math.max(0, ca - cb) + ' ' + T('st_removed') + ')</small></div></div>' +
      '<div class="stat"><div class="stat-label">' + T('st_words') + '</div><div class="stat-value">' + wa + ' → ' + wb + ' <small>(' + b.n + ' ' + T('st_sent') + ')</small></div></div>';
    $('stats').hidden = false;
  }

  async function run() {
    if (running) return;
    var text = input.value.trim();
    if (text.length < 5) { toast(T('t_empty')); input.focus(); return; }
    running = true; var btn = $('btnRun'); btn.disabled = true; $('btnRunText').textContent = T('processing');
    $('stats').hidden = true;

    var isToolMode = ['audit', 'sentiment', 'hooks', 'proofread'].indexOf(mode) !== -1;
    if (isToolMode) {
      $('outputEmpty').hidden = true;
      out.hidden = true;
      var tr = $('toolResult');
      if (tr) {
        tr.hidden = false;
        tr.innerHTML = '<div class="empty"><p>' + T('processing') + '</p></div>';
      }
      try {
        var tRes = await fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: mode, text: text, targetLanguage: $('targetLang').value })
        }).catch(function () { return null; });

        if (!tRes || !tRes.ok) {
          tRes = await fetch('https://ai.trujillomingorance.com/api/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: mode, text: text, targetLanguage: $('targetLang').value })
          });
        }

        if (!tRes.ok) {
          var errObj = await tRes.json().catch(function () { return {}; });
          throw new Error(errObj.error || ('HTTP ' + tRes.status));
        }

        var tJson = await tRes.json();
        renderToolData(mode, tJson.data, tr);
      } catch (e) {
        resetOut();
        toast(e.message || T('t_fail'));
      } finally {
        running = false;
        btn.disabled = false;
        $('btnRunText').textContent = LABEL[mode] || T('run_rewrite');
      }
      return;
    }

    showOut('', true);
    var acc = '', t0 = performance.now(), tFirst = 0;
    window.__rwTiming = null;
    try {
      var res = await fetch('/api/rewrite', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' },
        body: JSON.stringify({ text: text, mode: mode, stylePreset: $('stylePreset').value, targetLang: $('targetLang').value, language: 'auto', stream: true })
      });
      if (!res.ok) { var err = await res.json().catch(function () { return {}; }); throw new Error(err.error || (T('t_server') + ' (' + res.status + ')')); }
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('text/event-stream') !== -1 && res.body && res.body.getReader) {
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        for (;;) {
          var c = await reader.read(); if (c.done) break;
          buf += dec.decode(c.value, { stream: true });
          var lines = buf.split('\n'); buf = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim(); if (l.indexOf('data:') !== 0) continue;
            var d = l.slice(5).trim(); if (d === '[DONE]') continue;
            try { var p = JSON.parse(d); if (p.chunk) { if (!tFirst) tFirst = performance.now(); acc += p.chunk; showOut(acc, true); } if (p.reset) { acc = ''; showOut('', true); toast(T('t_adjust')); } if (p.done && p.text) acc = p.text; } catch (pe) {}
          }
        }
      } else {
        var data = await res.json(); acc = data.humanized || data.text || '';
      }
      if (!acc.trim()) throw new Error(T('t_noout'));
      if (!tFirst) tFirst = performance.now();
      showOut(acc.trim(), false);
      window.__rwTiming = { ttft: Math.round(tFirst - t0), total: Math.round(performance.now() - t0) };
      if (mode === 'stealth') renderStats(text, out.textContent);
    } catch (e) {
      resetOut(); toast(e.message || T('t_fail'));
    } finally {
      running = false; btn.disabled = false; $('btnRunText').textContent = LABEL[mode];
    }
  }

  function renderToolData(m, data, tr) {
    if (!tr || !data) return;
    if (m === 'audit') {
      var s = data.scores || {};
      var diag = data.diagnostico_detectores || {};
      var vers = data.versiones || {};
      var aiProb = s.ai_probability != null ? s.ai_probability : 50;
      var aiClass = aiProb < 25 ? 'tool-badge-green' : (aiProb < 60 ? 'tool-badge-yellow' : 'tool-badge-red');

      tr.innerHTML = '<div class="tool-card">' +
        '<div class="tool-grid" style="margin-bottom:12px;">' +
          '<div class="stat"><div class="stat-label">Calidad global</div><div class="stat-value">' + (s.global_quality ?? 0) + '%</div></div>' +
          '<div class="stat"><div class="stat-label">Probabilidad IA</div><div class="stat-value"><span class="tool-badge ' + aiClass + '">' + aiProb + '%</span></div></div>' +
          '<div class="stat"><div class="stat-label">Perplejidad</div><div class="stat-value">' + (s.perplexity ?? 0) + '</div></div>' +
          '<div class="stat"><div class="stat-label">Burstiness</div><div class="stat-value">' + (s.burstiness ?? 0) + '</div></div>' +
          '<div class="stat"><div class="stat-label">Gramática</div><div class="stat-value">' + (s.grammar ?? 0) + '%</div></div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">' +
          '<div class="stat"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">Simulación GPTZero</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(diag.gptzero_simulacion || 'Sin datos') + '</span></div>' +
          '<div class="stat"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">Simulación Copyleaks</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(diag.copyleaks_simulacion || 'Sin datos') + '</span></div>' +
        '</div>' +
        (data.analisis_critico ? '<div class="stat" style="margin-bottom:12px;"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">Análisis crítico</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(data.analisis_critico) + '</span></div>' : '') +
        '<div style="border-top:1px solid var(--border); padding-top:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
            '<strong style="font-size:.85rem;">Versiones optimizadas</strong>' +
            '<div style="display:flex; gap:4px;" id="vTabs">' +
              '<button type="button" class="version-tab is-active" data-v="human">Humanizada</button>' +
              '<button type="button" class="version-tab" data-v="seo">SEO</button>' +
              '<button type="button" class="version-tab" data-v="exec">Resumen ejecutivo</button>' +
            '</div>' +
          '</div>' +
          '<div id="vBox" style="background:var(--subtle); padding:12px; border-radius:10px; font-size:.9rem; line-height:1.6; white-space:pre-wrap; max-height:200px; overflow-y:auto; border:1px solid var(--border); margin-bottom:10px;"></div>' +
          '<div style="display:flex; justify-content:flex-end; gap:8px;">' +
            '<button type="button" class="btn btn-outline btn-sm" id="btnCopyV">Copiar versión</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="btnApplyV">Usar en el editor</button>' +
          '</div>' +
        '</div>' +
      '</div>';

      var versions = { human: vers.humanizada_antidetector || '', seo: vers.seo_optimizada || '', exec: vers.resumen_ejecutivo || '' };
      var curV = 'human';
      function setV(k) {
        curV = k;
        var box = $('vBox'); if (box) box.textContent = versions[k] || '';
        document.querySelectorAll('#vTabs .version-tab').forEach(function(b) { b.classList.toggle('is-active', b.dataset.v === k); });
      }
      setV('human');
      document.querySelectorAll('#vTabs .version-tab').forEach(function(b) {
        b.addEventListener('click', function() { setV(b.dataset.v); });
      });
      $('btnCopyV').addEventListener('click', function() {
        navigator.clipboard.writeText(versions[curV] || '').then(function() { toast(T('t_copied')); });
      });
      $('btnApplyV').addEventListener('click', function() {
        input.value = versions[curV] || '';
        counts();
        toast('Cargado en el editor');
      });

    } else if (m === 'sentiment') {
      var f = data.nivel_formalidad != null ? data.nivel_formalidad : 50;
      tr.innerHTML = '<div class="tool-card">' +
        '<h3 style="margin:0 0 12px; font-size:.95rem; font-weight:600;">Diagnóstico de tono y emoción</h3>' +
        '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:14px;">' +
          '<div class="stat"><div class="stat-label">Tono principal</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.tono_principal || 'Neutro') + '</div></div>' +
          '<div class="stat"><div class="stat-label">Intención</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.intencion || 'Informar') + '</div></div>' +
          '<div class="stat"><div class="stat-label">Emoción</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.emocion_detectada || 'Neutro') + '</div></div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div style="display:flex; justify-content:space-between; font-size:.82rem; margin-bottom:4px;"><span>Formalidad</span><strong>' + f + '%</strong></div>' +
          '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + f + '%;"></div></div>' +
          '<div style="display:flex; justify-content:space-between; font-size:.72rem; color:var(--muted);"><span>Casual</span><span>Estándar</span><span>Ultraformal</span></div>' +
        '</div>' +
        (data.sugerencia_ajuste ? '<div class="stat"><div class="stat-label">Sugerencia de ajuste</div><div style="font-size:.88rem; color:var(--text-2); margin-top:2px;">' + esc(data.sugerencia_ajuste) + '</div></div>' : '') +
      '</div>';

    } else if (m === 'hooks') {
      var hooks = Array.isArray(data.titulares_gancho) ? data.titulares_gancho : [];
      var angles = ['Curiosidad / Misterio', 'Beneficio directo / Dolor', 'Dato impactante / Contracorriente'];
      var hHtml = hooks.map(function(h, idx) {
        return '<div class="stat" style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">' +
          '<div><div class="stat-label">' + (angles[idx] || ('Gancho ' + (idx + 1))) + '</div><div style="font-size:.92rem; font-weight:600; margin-top:3px;">' + esc(h) + '</div></div>' +
          '<button type="button" class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(' + JSON.stringify(h) + ').then(function(){alert(\'Copiado\');})">Copiar</button>' +
        '</div>';
      }).join('');
      tr.innerHTML = '<div class="tool-card"><h3 style="margin:0 0 12px; font-size:.95rem; font-weight:600;">Ganchos virales de alta retención</h3>' + (hHtml || '<p class="empty">No se generaron titulares.</p>') + '</div>';

    } else if (m === 'proofread') {
      var errs = Array.isArray(data.errores_detectados) ? data.errores_detectados : [];
      var textCor = data.texto_corregido_estilo || '';
      var eHtml = errs.map(function(e) {
        return '<div style="background:var(--subtle); border-left:3px solid #EF4444; padding:8px 10px; border-radius:6px; margin-bottom:6px; font-size:.82rem;"><strong>' + esc(e.tipo || 'Observación') + ':</strong> ' + esc(e.descripcion || '') + '</div>';
      }).join('');

      tr.innerHTML = '<div class="tool-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
          '<h3 style="margin:0; font-size:.95rem; font-weight:600;">Auditoría de coherencia y estilo</h3>' +
          '<span class="tool-badge">' + errs.length + ' puntos detectados</span>' +
        '</div>' +
        (eHtml ? '<div style="margin-bottom:12px; max-height:160px; overflow-y:auto;">' + eHtml + '</div>' : '<p style="color:#10B981; font-size:.85rem; margin-bottom:12px;">Coherencia excelente: no se detectaron fallos lógicos ni redundancias.</p>') +
        '<div style="border-top:1px solid var(--border); padding-top:10px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span class="stat-label">Texto corregido</span>' +
            '<div style="display:flex; gap:6px;">' +
              '<button type="button" class="btn btn-outline btn-sm" id="btnCopyPf">Copiar</button>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnApplyPf">Aplicar al editor</button>' +
            '</div>' +
          '</div>' +
          '<div style="background:var(--subtle); padding:10px 12px; border-radius:10px; font-size:.88rem; line-height:1.6; white-space:pre-wrap; max-height:180px; overflow-y:auto; border:1px solid var(--border);">' + esc(textCor) + '</div>' +
        '</div>' +
      '</div>';

      var bC = $('btnCopyPf'), bA = $('btnApplyPf');
      if (bC) bC.onclick = function() { navigator.clipboard.writeText(textCor).then(function() { toast(T('t_copied')); }); };
      if (bA) bA.onclick = function() { input.value = textCor; counts(); toast('Texto corregido cargado'); };
    }
  }

})();
