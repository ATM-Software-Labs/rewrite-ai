/* Rewrite · ATM Software Labs — interfaz y sesión compartida con *.trujillomingorance.com */
(function () {
  'use strict';
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
    if (!me) { slot.innerHTML = '<button type="button" class="btn btn-primary btn-sm" data-open-auth>Entrar</button>'; return; }
    var name = me.name || me.username || me.handle || (me.email ? me.email.split('@')[0] : 'Usuario');
    var handle = String(me.handle || me.username || '').replace(/^@+/, '');
    var pic = me.avatar || me.picture || me.profile_image_url || '';
    var photo = pic ? '<img class="account-photo" src="' + esc(pic) + '" alt="" width="28" height="28" referrerpolicy="no-referrer">' : '<span class="account-photo">' + esc(initials(name)) + '</span>';
    slot.innerHTML = '<div class="account-wrap" id="account-wrap">' +
      '<button type="button" class="account-chip" id="account-btn" aria-haspopup="menu" aria-expanded="false" title="' + esc(name) + '">' + photo +
      '<span class="account-first">' + esc(String(name).split(/\s+/)[0]) + '</span></button>' +
      '<div class="account-menu" id="account-menu" role="menu" hidden>' +
      '<div class="account-menu-head"><strong>' + esc(name) + '</strong><span>' + esc(handle ? '@' + handle : (me.email || '')) + '</span></div>' +
      '<a role="menuitem" href="https://trujillomingorance.com/">trujillomingorance.com</a>' +
      '<button type="button" role="menuitem" data-logout>Cerrar sesión</button></div></div>';
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
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(function () { toast('Sesión cerrada'); });
  }
  loadMe();
  if (/[?&](auth|login)=/.test(location.search)) { if (/login/.test(location.search)) openAuth(); history.replaceState({}, '', '/'); }

  /* Espacio de trabajo */
  var mode = 'stealth', running = false;
  var input = $('inputText'), out = $('outputText');
  function words(t) { t = t.trim(); return t ? t.split(/\s+/).length : 0; }
  function counts() {
    var n = words(input.value); $('inWordCount').textContent = n + (n === 1 ? ' palabra' : ' palabras');
    var o = words(out.textContent); $('outWordCount').textContent = out.hidden ? '' : o + (o === 1 ? ' palabra' : ' palabras');
  }
  input.value = store('rw_draft') || '';
  input.addEventListener('input', function () { counts(); store('rw_draft', input.value); });
  counts();
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      document.querySelectorAll('.seg-btn').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
      $('btnRunText').textContent = mode === 'corrector' ? 'Corregir texto' : 'Reescribir texto';
      $('stylePreset').disabled = mode === 'corrector';
    });
  });
  function showOut(text, streaming) {
    $('outputEmpty').hidden = true; out.hidden = false; $('btnCopy').hidden = streaming;
    out.textContent = text; out.classList.toggle('cursor', !!streaming); counts();
  }
  function resetOut() { out.textContent = ''; out.hidden = true; $('outputEmpty').hidden = false; $('btnCopy').hidden = true; counts(); }
  $('btnClear').addEventListener('click', function () { input.value = ''; store('rw_draft', null); resetOut(); input.focus(); });
  $('btnPaste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { toast('Usa Ctrl + V para pegar'); return; }
    navigator.clipboard.readText().then(function (t) { if (t) { input.value = t; store('rw_draft', t); counts(); } }).catch(function () { toast('Usa Ctrl + V para pegar'); });
  });
  $('btnCopy').addEventListener('click', function () {
    var t = out.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copiado'); }, function () { toast('No se pudo copiar'); });
  });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });
  $('btnRun').addEventListener('click', run);

  async function run() {
    if (running) return;
    var text = input.value.trim();
    if (text.length < 5) { toast('Escribe o pega un texto primero'); input.focus(); return; }
    running = true; var btn = $('btnRun'); btn.disabled = true; $('btnRunText').textContent = 'Procesando…';
    showOut('', true);
    var acc = '';
    try {
      var res = await fetch('/api/rewrite', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' },
        body: JSON.stringify({ text: text, mode: mode, stylePreset: $('stylePreset').value, language: 'auto', stream: true })
      });
      if (!res.ok) { var err = await res.json().catch(function () { return {}; }); throw new Error(err.error || ('Error del servidor (' + res.status + ')')); }
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
            try { var p = JSON.parse(d); if (p.chunk) { acc += p.chunk; showOut(acc, true); } if (p.done && p.text) acc = p.text; } catch (pe) {}
          }
        }
      } else {
        var data = await res.json(); acc = data.humanized || data.text || '';
      }
      if (!acc.trim()) throw new Error('El modelo no devolvió texto. Inténtalo de nuevo.');
      showOut(acc.trim(), false);
    } catch (e) {
      resetOut(); toast(e.message || 'No se pudo procesar el texto');
    } finally {
      running = false; btn.disabled = false; $('btnRunText').textContent = mode === 'corrector' ? 'Corregir texto' : 'Reescribir texto';
    }
  }
})();
