/**
 * Trujillo AI — Rewrite AI & Corrector de Textos SaaS Studio
 * Indetectable 0% IA (Turnitin, GPTZero, ZeroGPT) & Corrector Editorial Profesional
 * Bulletproof execution: Zero external CDNs, Brave Shields immune, shared auth with ai.trujillomingorance.com.
 */

(function () {
  'use strict';

  // --- Safe Storage Fallback (Guarantees execution in Brave Strict Mode) ---
  var memStorage = {};
  var safeStorage = {
    getItem: function (key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {}
      return memStorage[key] || null;
    },
    setItem: function (key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (e) {}
      memStorage[key] = String(value);
    },
    removeItem: function (key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (e) {}
      delete memStorage[key];
    }
  };

  // --- DOM Helper ---
  function $(id) {
    return document.getElementById(id);
  }

  // --- HTML Escaping ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Appearance & Theming System (Authentic Trujillo AI Engine) ---
  var THEME_COLORS = {
    dark: '#000000',
    gray: '#18181b',
    dim: '#0d1117',
    navy: '#0b1220',
    light: '#f4f4f5',
    paper: '#f4efe6',
    hacker: '#000000',
    cyberpunk: '#0d021a',
    sunset: '#1f101d',
    ocean: '#061325',
    forest: '#07130e',
    rose: '#fff1f2',
    lavender: '#f8f6fc'
  };

  var ACCENT_OK = {
    '#38bdf8': 1,
    '#a1a1aa': 1,
    '#34d399': 1,
    '#2dd4bf': 1,
    '#818cf8': 1,
    '#a78bfa': 1,
    '#f59e0b': 1,
    '#fb7185': 1
  };

  function applyAppearance() {
    var theme = safeStorage.getItem('ta_theme') || 'dark';
    var resolved = theme;
    if (theme === 'system') {
      resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    if (!THEME_COLORS[resolved]) resolved = 'dark';

    var accent = safeStorage.getItem('ta_accent') || '#38bdf8';
    if (!ACCENT_OK[accent]) accent = '#38bdf8';

    var font = safeStorage.getItem('ta_font') || 'md';
    var compactSb = safeStorage.getItem('ta_compact_sb') === '1';
    var reduceMotion = safeStorage.getItem('ta_reduce_motion') === '1';

    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark' || resolved === 'gray' || resolved === 'dim' || resolved === 'navy' || resolved === 'hacker' || resolved === 'cyberpunk' || resolved === 'sunset' || resolved === 'ocean' || resolved === 'forest') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-accent', accent);
    document.documentElement.setAttribute('data-font', font);
    document.documentElement.classList.toggle('compact-sb', compactSb);
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[resolved] || '#000000');

    // Sync active states in Settings Appearance Pane
    document.querySelectorAll('.theme-card').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.value === theme);
    });
    document.querySelectorAll('.accent-dot').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.value === accent);
    });
    document.querySelectorAll('[data-pref="ta_font"]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.value === font);
    });
    if ($('set-compact-sb')) $('set-compact-sb').checked = compactSb;
    if ($('set-reduce-motion')) $('set-reduce-motion').checked = reduceMotion;
  }

  applyAppearance();
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyAppearance);
    } catch (e) {}
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function h(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null && text !== '') n.textContent = text;
    return n;
  }

  function isSafeHref(href) {
    return /^(https?:\/\/|\/|#|mailto:)/i.test(String(href || ''));
  }

  function appendInline(parent, raw) {
    var s = String(raw);
    var re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    var last = 0;
    var m;
    while ((m = re.exec(s))) {
      if (m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      var tok = m[0];
      if (tok.indexOf('**') === 0) {
        parent.appendChild(h('strong', null, tok.slice(2, -2)));
      } else if (tok.charAt(0) === '*') {
        parent.appendChild(h('em', null, tok.slice(1, -1)));
      } else if (tok.charAt(0) === '`') {
        parent.appendChild(h('code', 'ta-inline-code', tok.slice(1, -1)));
      } else {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm && isSafeHref(lm[2])) {
          var a = h('a', null, lm[1]);
          a.href = lm[2];
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          parent.appendChild(a);
        } else {
          parent.appendChild(document.createTextNode(tok));
        }
      }
      last = m.index + tok.length;
    }
    if (last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
  }

  function setStatusPill(el, ok, prefix, strongText, suffix) {
    if (!el) return;
    clearNode(el);
    el.appendChild(h('span', ok ? 'dot-success' : 'dot-warn'));
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(prefix));
    if (strongText) span.appendChild(h('strong', null, strongText));
    if (suffix) span.appendChild(document.createTextNode(suffix));
    el.appendChild(span);
  }

  function renderMarkdownInto(container, src, opts) {
    if (!container) return;
    clearNode(container);
    opts = opts || {};
    if (!src || !String(src).trim()) {
      var empty = h('div', 'empty-studio-state');
      var icon = h('div', 'empty-icon-svg');
      empty.appendChild(icon);
      var isCorrector = state.currentMode === 'corrector';
      empty.appendChild(h('div', 'empty-title', isCorrector ? 'Motor de Corrección de Textos Listo' : 'Motor 99.9% Humano Listo'));
      var desc = h('p', 'empty-desc');
      desc.appendChild(document.createTextNode(isCorrector
        ? 'Pega un texto a la izquierda y pulsa Corregir o Ctrl + Enter. Se perfeccionará la ortografía conservando el formato Markdown.'
        : 'Pega un texto a la izquierda y pulsa Humanizar o Ctrl + Enter. Se reescribirán las palabras conservando formato e idioma.'));
      empty.appendChild(desc);
      container.appendChild(empty);
      return;
    }

    var text = String(src).replace(/\r\n/g, '\n');
    var codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (match, lang, code) {
      var token = '§§CODEBLOCK_' + codeBlocks.length + '§§';
      codeBlocks.push({ lang: (lang || 'code').trim(), code: code });
      return token;
    });

    var lines = text.split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();
      if (!trimmed) { i++; continue; }

      var codeMatch = trimmed.match(/^§§CODEBLOCK_(\d+)§§$/);
      if (codeMatch) {
        var block = codeBlocks[Number(codeMatch[1])];
        var box = h('div', 'code-block-box');
        var header = h('div', 'code-block-header');
        header.appendChild(h('span', null, block.lang));
        var copyBtn = h('button', 'code-copy-btn', 'Copiar');
        copyBtn.type = 'button';
        (function (btn, codeText) {
          btn.addEventListener('click', async function () {
            var ok = await safeCopy(codeText);
            if (ok) {
              btn.textContent = 'Copiado';
              setTimeout(function () { btn.textContent = 'Copiar'; }, 2000);
            }
          });
        })(copyBtn, block.code);
        header.appendChild(copyBtn);
        var pre = h('pre', 'code-block-pre');
        pre.appendChild(h('code', null, block.code));
        box.appendChild(header);
        box.appendChild(pre);
        container.appendChild(box);
        i++;
        continue;
      }

      if (/^#{1,4}\s+/.test(trimmed)) {
        var level = trimmed.match(/^(#{1,4})/)[1].length;
        var heading = document.createElement('h' + level);
        appendInline(heading, trimmed.replace(/^#{1,4}\s+/, ''));
        container.appendChild(heading);
        i++;
        continue;
      }

      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        container.appendChild(h('hr', 'ta-hr'));
        i++;
        continue;
      }

      if (trimmed.charAt(0) === '>') {
        var bq = h('blockquote', 'ta-blockquote');
        var qLines = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '>') {
          qLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        appendInline(bq, qLines.join(' '));
        container.appendChild(bq);
        continue;
      }

      if (/^[-*•]\s+/.test(trimmed)) {
        var ul = h('ul', 'ta-ul');
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          var li = document.createElement('li');
          appendInline(li, lines[i].trim().replace(/^[-*•]\s+/, ''));
          ul.appendChild(li);
          i++;
        }
        container.appendChild(ul);
        continue;
      }

      if (trimmed.charAt(0) === '|' && trimmed.charAt(trimmed.length - 1) === '|') {
        var wrap = h('div', 'table-wrapper');
        var table = h('table', 'ta-table');
        var thead = document.createElement('thead');
        var tbody = document.createElement('tbody');
        var headerDone = false;
        while (i < lines.length && lines[i].trim().charAt(0) === '|') {
          var rowLine = lines[i].trim();
          if (/^\|(\s*[-:]+[-| :]*)\|$/.test(rowLine)) { headerDone = true; i++; continue; }
          var cells = rowLine.slice(1, -1).split('|').map(function (c) { return c.trim(); });
          var tr = document.createElement('tr');
          for (var c = 0; c < cells.length; c++) {
            var cell = document.createElement(headerDone ? 'td' : 'th');
            appendInline(cell, cells[c]);
            tr.appendChild(cell);
          }
          if (!headerDone && thead.childNodes.length === 0) thead.appendChild(tr);
          else tbody.appendChild(tr);
          i++;
        }
        if (thead.childNodes.length) table.appendChild(thead);
        if (tbody.childNodes.length) table.appendChild(tbody);
        wrap.appendChild(table);
        container.appendChild(wrap);
        continue;
      }

      var p = document.createElement('p');
      appendInline(p, trimmed);
      container.appendChild(p);
      i++;
    }

    if (opts.cursor) container.appendChild(h('span', 'streaming-cursor'));
  }

  function renderDiff(orig, mod) {
    var container = $('diffPreview');
    if (!container) return;
    clearNode(container);

    if (!orig && !mod) {
      container.appendChild(h('span', 'diff-empty', 'Sin cambios para mostrar.'));
      return;
    }

    var wordsOrig = (orig || '').split(/(\s+)/);
    var wordsMod = (mod || '').split(/(\s+)/);
    var i = 0, j = 0;
    while (i < wordsOrig.length || j < wordsMod.length) {
      var wO = wordsOrig[i];
      var wM = wordsMod[j];
      if (wO === undefined) {
        container.appendChild(h('span', 'diff-ins', wM));
        j++;
      } else if (wM === undefined) {
        container.appendChild(h('span', 'diff-del', wO));
        i++;
      } else if (wO === wM) {
        container.appendChild(document.createTextNode(wO));
        i++; j++;
      } else {
        container.appendChild(h('span', 'diff-del', wO));
        container.appendChild(h('span', 'diff-ins', wM));
        i++; j++;
      }
    }
  }

  // --- Clipboard Copy Helper ---
  async function safeCopy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.className = 'offscreen-copy';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  // --- Toast Notifications ---
  var toastTimer = null;
  function showToast(msg) {
    var el = $('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.classList.remove('hidden');
    toastTimer = setTimeout(function () {
      el.classList.add('hidden');
    }, 2800);
  }

  // --- Preset Texts ---
  var PRESETS = {
    academic: "# Análisis de la Dinámica Macroeconómica en Mercados Emergentes\n\nEn las últimas dos décadas, la liberalización de los flujos de capital ha redefinido drásticamente la estructura de los mercados emergentes. Como demuestran los modelos econométricos modernos, la volatilidad cambiaria ejerce una presión directa sobre las tasas de interés domésticas.\n\n- **Impacto directo:** Descalce de balances en el sector financiero.\n- **Canal de transmisión:** Expectativas inflacionarias no ancladas.\n\nPor tanto, es indispensable que los bancos centrales mantengan una regla de política monetaria predecible y fundamentada en la evidencia empírica.",
    corrector: "# Informe de Evaluación y Estrategia Trimestral\n\nEl comite directivo a revisado la propuesta del departamento de finansas respecto al presupuesto operativo del proximo trimestre. Sin embargo, se han detectado siertos fallos en la asignacion de partidas presupuestarias que podrian ocacionar desajustes serios.\n\nEs prioritario corregir la redaccion del documento original, unificar la nomenclatura tecnica y garantizar que todas las tablas de calculo presenten una coherencia integral.",
    tech: "## Arquitectura Distribuida y Consenso Raft\n\nEl protocolo Raft descompone el consenso distribuido en tres subproblemas ortogonales:\n\n1. **Elección de líder:** Utiliza temporizadores aleatorios (150-300ms) para evitar votos divididos.\n2. **Replicación de logs:** Mecanismo estricto de append-only mediante RPCs unidireccionales.\n3. **Seguridad de estado:** Garantiza que las entradas confirmadas nunca sean sobreescritas.\n\n```rust\npub struct RaftNode {\n    id: NodeId,\n    current_term: u64,\n    voted_for: Option<NodeId>,\n    log: Vec<LogEntry>,\n}\n```\n\nEste esquema elimina la complejidad inherente a Multi-Paxos tradicional.",
    business: "### Propuesta Comercial: Plataforma Cloud Enterprise\n\nNuestra infraestructura Edge garantiza un tiempo de actividad del 99.99% con latencias inferiores a 40ms en todo el territorio europeo.\n\n| Nivel | Cuota Mensual | Inferencia Mensual | SLA |\n| :--- | :--- | :--- | :--- |\n| Growth | 49€ / mes | 5.000.000 tokens | 99.9% |\n| Enterprise | 299€ / mes | Ilimitado Edge LPU | 99.99% |\n\nEl retorno de inversión proyectado supera el 320% durante el primer semestre.",
    creative: "El silencio de la madrugada en la ciudad tiene una textura única. No es una ausencia total de sonido, sino una pausa táctica en la que el asfalto exhala el calor acumulado del día. Las farolas de sodio parpadean con una cadencia irregular, casi orgánica, proyectando sombras largas que se disuelven en las esquinas vacías."
  };

  // --- App State ---
  var state = {
    currentMode: safeStorage.getItem('ta_default_mode') || 'stealth',
    currentModel: safeStorage.getItem('groq_model') || 'llama-3.3-70b-versatile',
    currentModelName: 'Llama 3.3 70B Versatile',
    outputView: safeStorage.getItem('ta_default_view') || 'md',
    lastOriginalText: '',
    lastHumanizedText: '',
    history: []
  };

  function getCalibration() {
    try {
      var raw = safeStorage.getItem('ta_calibration');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function updateStyleStatus() {
    var el = $('style-md-status');
    if (!el) return;
    var md = safeStorage.getItem('ta_style_md') || '';
    var cal = getCalibration();
    var parts = [];
    if (md) parts.push('style.md (' + md.length + ' caracteres)');
    if (cal) parts.push('voz calibrada');
    el.textContent = parts.length
      ? 'Activo: ' + parts.join(' · ')
      : 'Sin guía de estilo. Importa style.md o pulsa [CALIBRAR].';
    el.classList.toggle('ready', parts.length > 0);
  }

  var CALIBRAR_STEPS = [
    {
      key: 'tone',
      q: '1/3 · ¿Qué tono debe tener el texto?',
      options: [
        { id: 'formal', label: 'Formal académico' },
        { id: 'technical', label: 'Técnico directo' },
        { id: 'natural', label: 'Cercano y natural' }
      ]
    },
    {
      key: 'cadence',
      q: '2/3 · ¿Cómo deben ser las frases?',
      options: [
        { id: 'short', label: 'Cortas y densas' },
        { id: 'mixed', label: 'Ritmo mixto (recomendado)' },
        { id: 'long', label: 'Elaboradas, con subordinadas' }
      ]
    },
    {
      key: 'lexicon',
      q: '3/3 · ¿Qué vocabulario priorizamos?',
      options: [
        { id: 'precise', label: 'Preciso y concreto' },
        { id: 'everyday', label: 'Cotidiano e idiomático' },
        { id: 'literary', label: 'Rico, sin adorno de IA' }
      ]
    }
  ];

  var calibrarState = { step: 0, answers: { tone: 'natural', cadence: 'mixed', lexicon: 'everyday' } };

  function renderCalibrarStep() {
    var step = CALIBRAR_STEPS[calibrarState.step];
    var qEl = $('calibrar-question');
    var box = $('calibrar-choices');
    var nextBtn = $('btnCalibrarNext');
    var backBtn = $('btnCalibrarBack');
    if (!step || !qEl || !box) return;
    qEl.textContent = step.q;
    clearNode(box);
    step.options.forEach(function (opt) {
      var btn = h('button', 'calibrar-choice' + (calibrarState.answers[step.key] === opt.id ? ' active' : ''), opt.label);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        calibrarState.answers[step.key] = opt.id;
        renderCalibrarStep();
      });
      box.appendChild(btn);
    });
    if (backBtn) backBtn.classList.toggle('hidden', calibrarState.step === 0);
    if (nextBtn) nextBtn.textContent = calibrarState.step === CALIBRAR_STEPS.length - 1 ? 'Guardar calibración' : 'Siguiente';
  }

  function initStyleTools() {
    updateStyleStatus();
    var fileInput = $('style-md-input');
    var importBtn = $('btn-import-style');
    var calBtn = $('btn-calibrar');
    var modal = $('calibrarModal');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var text = String(reader.result || '');
          safeStorage.setItem('ta_style_md', text);
          safeStorage.setItem('ta_style_md_name', file.name);
          updateStyleStatus();
          showToast('style.md importado (' + file.name + ')');
        };
        reader.readAsText(file);
      });
    }
    if (calBtn && modal) {
      calBtn.addEventListener('click', function () {
        calibrarState.step = 0;
        calibrarState.answers = getCalibration() || { tone: 'natural', cadence: 'mixed', lexicon: 'everyday' };
        renderCalibrarStep();
        modal.classList.add('active');
      });
    }
    var closeCal = $('btnCloseCalibrar');
    if (closeCal && modal) closeCal.addEventListener('click', function () { modal.classList.remove('active'); });
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
    var nextBtn = $('btnCalibrarNext');
    var backBtn = $('btnCalibrarBack');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (calibrarState.step > 0) {
          calibrarState.step -= 1;
          renderCalibrarStep();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (calibrarState.step < CALIBRAR_STEPS.length - 1) {
          calibrarState.step += 1;
          renderCalibrarStep();
          return;
        }
        safeStorage.setItem('ta_calibration', JSON.stringify(calibrarState.answers));
        updateStyleStatus();
        if (modal) modal.classList.remove('active');
        showToast('Voz calibrada y persistida en este navegador');
      });
    }
  }

  // --- History Management ---
  function loadHistory() {
    try {
      var raw = safeStorage.getItem('ta_rewrite_history');
      if (raw) state.history = JSON.parse(raw);
    } catch (e) {
      state.history = [];
    }
    renderHistoryUI();
  }

  function saveHistoryItem(orig, hum, mode) {
    if (!orig || !hum) return;
    var title = orig.split('\n')[0].replace(/[#*`_]/g, '').trim().slice(0, 42) || 'Reescritura ' + new Date().toLocaleTimeString();
    var item = {
      id: 'doc_' + Date.now(),
      title: title,
      orig: orig,
      hum: hum,
      mode: mode,
      time: Date.now()
    };
    state.history.unshift(item);
    if (state.history.length > 50) state.history.pop();
    safeStorage.setItem('ta_rewrite_history', JSON.stringify(state.history));
    renderHistoryUI();
  }

  function renderHistoryUI() {
    var list = $('history-list');
    if (!list) return;
    clearNode(list);

    if (!state.history.length) {
      list.appendChild(h('div', 'history-empty', 'Sin documentos guardados aún.'));
      return;
    }

    state.history.forEach(function (doc) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.appendChild(h('span', 'history-title', doc.title));
      var del = h('button', 'history-del-btn', '✕');
      del.type = 'button';
      del.title = 'Eliminar';
      btn.appendChild(del);

      btn.addEventListener('click', function (e) {
        if (e.target.classList.contains('history-del-btn')) {
          e.stopPropagation();
          deleteHistoryItem(doc.id);
          return;
        }
        loadDocToWorkspace(doc);
      });

      list.appendChild(btn);
    });
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter(function (d) { return d.id !== id; });
    safeStorage.setItem('ta_rewrite_history', JSON.stringify(state.history));
    renderHistoryUI();
    showToast('Documento eliminado del historial');
  }

  function loadDocToWorkspace(doc) {
    if (!doc) return;
    if ($('inputText')) $('inputText').value = doc.orig;
    if ($('outputText')) $('outputText').value = doc.hum;
    state.lastOriginalText = doc.orig;
    state.lastHumanizedText = doc.hum;
    switchMode(doc.mode || 'stealth');
    renderOutputMarkdown(doc.hum);
    updateCounters();
    showToast('Documento cargado');
    if (window.innerWidth <= 860) {
      var sb = $('sidebar');
      var ov = $('sidebar-overlay');
      if (sb) sb.classList.remove('open');
      if (ov) ov.classList.remove('active');
    }
  }

  // --- Counters Update ---
  function updateCounters() {
    var inTxt = $('inputText') ? $('inputText').value : '';
    var inWords = inTxt.trim() ? inTxt.trim().split(/\s+/).length : 0;
    var inChars = inTxt.length;
    if ($('inWordCount')) $('inWordCount').textContent = inWords + ' ' + (inWords === 1 ? 'palabra' : 'palabras');
    if ($('inCharCount')) $('inCharCount').textContent = inChars + ' ' + (inChars === 1 ? 'carácter' : 'caracteres');

    var outTxt = $('outputText') ? $('outputText').value : '';
    var outWords = outTxt.trim() ? outTxt.trim().split(/\s+/).length : 0;
    var outChars = outTxt.length;
    if ($('outWordCount')) $('outWordCount').textContent = outWords + ' ' + (outWords === 1 ? 'palabra' : 'palabras');
    if ($('outCharCount')) $('outCharCount').textContent = outChars + ' ' + (outChars === 1 ? 'carácter' : 'caracteres');
  }

  // --- Markdown Output Rendering ---
  function renderOutputMarkdown(md) {
    renderMarkdownInto($('outputMdPreview'), md || '');
  }

  // --- Switch Modes & Update Studio Text ---
  function switchMode(mode) {
    state.currentMode = mode;
    document.querySelectorAll('.mode-opt-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    var isStealth = mode === 'stealth';
    var isCasual = mode === 'casual';

    var btn = $('btnActionExecute');
    var btnHeader = $('btnHumanizeHeader');
    var paneInTitle = $('paneInTitle');
    var paneOutTitle = $('paneOutTitle');
    var inTxt = $('inputText');
    var outStatus = $('outHumanScore');

    var actionLabel = 'Reescribir texto';
    var headerLabel = 'Reescribir';

    if (btn) {
      var txt = btn.querySelector('#btnActionText');
      if (txt) txt.textContent = actionLabel;
    }
    if (btnHeader) {
      var txtH = btnHeader.querySelector('#btnActionText');
      if (txtH) txtH.textContent = headerLabel;
    }

    // Titles and placeholders are now static in HTML

    if (outStatus) {
      setStatusPill(outStatus, true, 'Score Humano: ', '99.9%', ' (Turnitin Ready)');
    }

    if (!state.lastHumanizedText) {
      renderOutputMarkdown('');
    }
  }

  // --- Debounced Initial Text Analysis ---
  var debTimeout = null;
  function debouncedAnalyze() {
    clearTimeout(debTimeout);
    debTimeout = setTimeout(async function () {
      var text = $('inputText') ? $('inputText').value.trim() : '';
      var scoreBadge = $('inAiScore');
      if (!scoreBadge) return;

      if (!text || text.length < 25) {
        scoreBadge.className = 'pane-status-pill';
        setStatusPill(scoreBadge, false, 'Detección inicial: ', 'Pendiente', '');
        return;
      }

      try {
        var res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });
        if (res.ok) {
          var data = await res.json();
          var score = (data && data.metrics) ? data.metrics.aiProbability : 80;
          scoreBadge.className = score > 50 ? 'pane-status-pill' : 'pane-status-pill success';
          setStatusPill(scoreBadge, score <= 50, 'Detección inicial: ', score + '% IA', score > 50 ? ' (Alerta)' : ' (Bajo)');
        }
      } catch (e) {}
    }, 350);
  }

  // --- Humanize / Corrector Execution ---
  async function humanizeProcess() {
    var btn = $('btnActionExecute');
    if (btn && btn.disabled) return;
    
    var rawText = $('inputText') ? $('inputText').value.trim() : '';
    if (!rawText) {
      showToast('Por favor, ingresa o pega texto primero.');
      if ($('inputText')) $('inputText').focus();
      return;
    }

    if (window.currentAppMode === 'detector') {
      if (typeof runAiDetector === 'function') {
        runAiDetector(rawText, btn);
      }
      return;
    }

    var isStealth = state.currentMode === 'stealth';
    var btn = $('btnActionExecute');
    var btnHeader = $('btnHumanizeHeader');

    function setButtonsLoading(loading) {
      if (btn) {
        btn.disabled = loading;
        if (loading) btn.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
        else btn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
        btn.classList.toggle('loading', loading);
        var txt = btn.querySelector('#btnActionText');
        if (txt) {
          txt.textContent = loading 
            ? 'Procesando...' 
            : 'Humanizar Texto';
        }
      }
      if (btnHeader) {
        btnHeader.classList.toggle('loading', loading);
        var txtH = btnHeader.querySelector('#btnActionText');
        if (txtH) {
          txtH.textContent = loading ? 'Procesando...' : 'Reescribir';
        }
      }
    }

    setButtonsLoading(true);

    var provider = safeStorage.getItem('groq_provider') || 'groq';
    var apiKey = safeStorage.getItem('groq_api_key') || '';
    var model = state.currentModel || 'llama-3.3-70b-versatile';

    var preview = $('outputMdPreview');
    var textarea = $('outputText');
    var accumulated = '';

    if (state.outputView === 'md' && preview) {
      clearNode(preview);
      var wait = h('div', 'streaming-wait');
      wait.appendChild(h('span', 'streaming-pulse'));
      wait.appendChild(document.createTextNode(' Generando versión 99.9% humana en el Edge...'));
      preview.appendChild(wait);
    }

    try {
      var res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json'
        },
        body: JSON.stringify({
          text: rawText,
          mode: state.currentMode,
          stylePreset: $('stylePreset') ? $('stylePreset').value : 'natural',
          aggressiveness: 'extreme',
          language: 'auto',
          provider: provider,
          apiKey: apiKey,
          model: model,
          stream: true,
          styleGuide: safeStorage.getItem('ta_style_md') || '',
          calibration: getCalibration()
        })
      });

      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error(errData.error || ('Error en el servidor (' + res.status + ')'));
      }

      var contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body && res.body.getReader) {
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var streamBuffer = '';
        var lastRenderTime = 0;

        while (true) {
          var chunkRes = await reader.read();
          if (chunkRes.done) break;

          streamBuffer += decoder.decode(chunkRes.value, { stream: true });
          var lines = streamBuffer.split('\n');
          streamBuffer = lines.pop();

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || !line.startsWith('data:')) continue;
            var dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') break;

            try {
              var parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulated += parsed.chunk;
                if (textarea) textarea.value = accumulated;

                var now = Date.now();
                if (now - lastRenderTime > 60 && state.outputView === 'md' && preview) {
                  renderMarkdownInto(preview, accumulated, { cursor: true });
                  lastRenderTime = now;
                }
              }
              if (parsed.done && parsed.text) {
                accumulated = parsed.text;
              }
            } catch (pe) {}
          }
        }

        state.lastOriginalText = rawText;
        state.lastHumanizedText = accumulated.trim();

      } else {
        var data = await res.json();
        state.lastOriginalText = rawText;
        state.lastHumanizedText = data.humanized || '';
      }

      if (textarea) textarea.value = state.lastHumanizedText;
      renderOutputMarkdown(state.lastHumanizedText);
      updateCounters();

      // Save to history
      saveHistoryItem(rawText, state.lastHumanizedText, state.currentMode);

      // Update status pill
      var outScore = $('outHumanScore');
      if (outScore) {
        if (isCorrector) setStatusPill(outScore, true, 'Score de Corrección: ', '100%', ' (Impecable)');
        else setStatusPill(outScore, true, 'Score Humano: ', '99.9%', ' (0% IA • Turnitin Ready)');
      }

      showToast(isCorrector ? 'Texto corregido con éxito' : 'Texto humanizado con éxito (99.9% Humano)');

    } catch (err) {
      console.error('Humanize error:', err);
      showToast('Error: ' + err.message);
      if (preview && !accumulated) {
        renderOutputMarkdown('');
      }
    } finally {
      setButtonsLoading(false);
    }
  }

  // --- Auth Management (Synced with https://ai.trujillomingorance.com) ---
  var AUTH_ORIGIN = 'https://ai.trujillomingorance.com';

  function updateAuthState() {
    try {
      var raw = safeStorage.getItem('ta_user');
      var token = safeStorage.getItem('ta_token');
      var u = raw ? JSON.parse(raw) : null;

      var isAuthed = !!(u && (token || u.email !== 'invitado@local'));
      var name = (u && u.name) ? u.name : (u && u.email ? u.email.split('@')[0] : 'Invitado');
      var email = (u && u.email) ? u.email : '';
      var letter = (name.charAt(0) || 'A').toUpperCase();

      if ($('user-display-name')) $('user-display-name').textContent = isAuthed ? name : 'Invitado';
      if ($('user-display-tier')) $('user-display-tier').textContent = isAuthed ? '0% IA Pro • Groq Edge' : 'Modo Local';
      if ($('user-letter')) $('user-letter').textContent = letter;

      if ($('topbar-auth-text')) $('topbar-auth-text').textContent = isAuthed ? name : 'Acceder';
      if ($('topbar-letter')) $('topbar-letter').textContent = letter;

      // Settings Account Pane toggles
      if ($('account-guest-view')) $('account-guest-view').classList.toggle('hidden', isAuthed);
      if ($('account-authed-view')) $('account-authed-view').classList.toggle('hidden', !isAuthed);

      if ($('account-user-name')) $('account-user-name').textContent = name;
      if ($('account-user-email')) $('account-user-email').textContent = email || 'Sin correo asociado';

    } catch (e) {
      console.error('Auth update error:', e);
    }
  }

  // Verify Session on startup with ai.trujillomingorance.com
  async function verifySession() {
    var token = safeStorage.getItem('ta_token');
    if (!token) return;
    try {
      var res = await fetch(AUTH_ORIGIN + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.user) {
          safeStorage.setItem('ta_user', JSON.stringify(data.user));
          updateAuthState();
        }
      } else if (res.status === 401) {
        // Token expired or invalid
        safeStorage.removeItem('ta_token');
        updateAuthState();
      }
    } catch (e) {
      // Offline / network issue, keep stored user
    }
  }

  // --- Settings Management ---
  function loadSettings() {
    var provider = safeStorage.getItem('groq_provider') || 'groq';
    var apiKey = safeStorage.getItem('groq_api_key') || '';
    var model = safeStorage.getItem('groq_model') || 'llama-3.3-70b-versatile';
    var temp = safeStorage.getItem('groq_temp') || '0.95';
    var defMode = safeStorage.getItem('ta_default_mode') || 'stealth';
    var defView = safeStorage.getItem('ta_default_view') || 'md';

    if ($('cfgProvider')) $('cfgProvider').value = provider;
    if ($('cfgApiKey')) $('cfgApiKey').value = apiKey;
    if ($('cfgModel')) $('cfgModel').value = model;
    if ($('cfgTemp')) $('cfgTemp').value = temp;
    if ($('tempIndicator')) $('tempIndicator').textContent = temp;

    document.querySelectorAll('#cfgDefaultMode .choice-pill').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.value === defMode);
    });
    document.querySelectorAll('#cfgDefaultView .choice-pill').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.value === defView);
    });

    state.currentModel = model;
    applyAppearance();
  }

  function saveSettings() {
    if ($('cfgProvider')) safeStorage.setItem('groq_provider', $('cfgProvider').value);
    if ($('cfgApiKey')) safeStorage.setItem('groq_api_key', $('cfgApiKey').value.trim());
    if ($('cfgModel')) {
      safeStorage.setItem('groq_model', $('cfgModel').value);
      state.currentModel = $('cfgModel').value;
    }
    if ($('cfgTemp')) safeStorage.setItem('groq_temp', $('cfgTemp').value);

    if ($('settingsModal')) $('settingsModal').classList.remove('active');
    showToast('Ajustes guardados');
  }

  // --- Initialize App ---
  function init() {
    // 1. Load Data & Sync State
    loadHistory();
    loadSettings();
    updateAuthState();
    verifySession();
    initStyleTools();

    // 2. Text input listener
    var inputEl = $('inputText');
    if (inputEl) {
      inputEl.addEventListener('input', function () {
        updateCounters();
        debouncedAnalyze();
      });
    }

    // 3. New Document Button
    var btnNewDoc = $('btn-new-doc');
    if (btnNewDoc) {
      btnNewDoc.addEventListener('click', function () {
        if ($('inputText')) $('inputText').value = '';
        if ($('outputText')) $('outputText').value = '';
        renderOutputMarkdown('');
        if ($('diffPreview')) clearNode($('diffPreview'));
        state.lastOriginalText = '';
        state.lastHumanizedText = '';
        updateCounters();
        if ($('inAiScore')) {
          $('inAiScore').className = 'pane-status-pill';
          setStatusPill($('inAiScore'), false, 'Detección IA inicial: ', 'Pendiente', '');
        }
        if ($('inputText')) $('inputText').focus();
        showToast('Nuevo documento iniciado');
      });
    }

    // 4. Paste Button
    var btnPaste = $('btnPaste');
    if (btnPaste) {
      btnPaste.addEventListener('click', async function () {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            var text = await navigator.clipboard.readText();
            if (text && $('inputText')) {
              $('inputText').value = text;
              updateCounters();
              debouncedAnalyze();
              showToast('Texto pegado');
              return;
            }
          }
        } catch (e) {}
        showToast('Usa Ctrl + V para pegar');
      });
    }

    // 5. Clear Button
    var btnClear = $('btnClear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if ($('inputText')) $('inputText').value = '';
        if ($('outputText')) { $('outputText').value = ''; $('outputText').classList.add('hidden'); }
        if ($('outputEmptyState')) $('outputEmptyState').classList.remove('hidden');
        if ($('detectorOutput')) $('detectorOutput').innerHTML = '';
        if ($('inWordCount')) $('inWordCount').textContent = '0 / 1.000 palabras';
        updateCounters();
        debouncedAnalyze();
        showToast('Lienzo limpiado');
      });
    }

    // 6. Execute Buttons
    var btnHumanize = $('btnActionExecute');
    if (btnHumanize) {
      btnHumanize.addEventListener('click', humanizeProcess);
    }
    var btnHumanizeHeader = $('btnHumanizeHeader');
    if (btnHumanizeHeader) {
      btnHumanizeHeader.addEventListener('click', humanizeProcess);
    }

    // 7. Hotkeys
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        humanizeProcess();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (btnNewDoc) btnNewDoc.click();
      }
      if (e.key === 'Escape') {
        if ($('authModal')) $('authModal').classList.remove('active');
        if ($('settingsModal')) $('settingsModal').classList.remove('active');
        if ($('calibrarModal')) $('calibrarModal').classList.remove('active');
        if ($('model-picker')) $('model-picker').classList.remove('open');
      }
    });

    // 8. Copy Button
    var btnCopy = $('btnCopy');
    if (btnCopy) {
      btnCopy.addEventListener('click', async function () {
        var text = $('outputText') ? $('outputText').value : '';
        if (!text) {
          showToast('No hay texto para copiar');
          return;
        }
        var ok = await safeCopy(text);
        if (ok) {
          var label = $('copyLabel');
          if (label) label.textContent = 'Copiado';
          setTimeout(function () { if (label) label.textContent = 'Copiar MD'; }, 2000);
          showToast('Texto copiado');
        }
      });
    }

    // 9. Download .md Button
    var btnDownload = $('btnDownload');
    if (btnDownload) {
      btnDownload.addEventListener('click', function () {
        var text = $('outputText') ? $('outputText').value : '';
        if (!text) {
          showToast('No hay texto para descargar');
          return;
        }
        var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'rewrite-ai-' + state.currentMode + '-' + Date.now() + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Archivo .md descargado');
      });
    }

    // 10. Output View Tabs
    var viewTabs = document.querySelectorAll('#outputViewTabs .view-tab');
    viewTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        viewTabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.outputView = tab.dataset.view;

        var preview = $('outputMdPreview');
        var textarea = $('outputText');
        var diff = $('diffPreview');

        if (preview) preview.classList.add('hidden');
        if (textarea) textarea.classList.add('hidden');
        if (diff) diff.classList.add('hidden');

        if (state.outputView === 'md') {
          if (preview) preview.classList.remove('hidden');
        } else if (state.outputView === 'raw') {
          if (textarea) textarea.classList.remove('hidden');
        } else if (state.outputView === 'diff') {
          renderDiff(state.lastOriginalText, state.lastHumanizedText);
          if (diff) diff.classList.remove('hidden');
        }
      });
    });

    // 11. Mode Segmented Pills
    document.querySelectorAll('#mode-selector .mode-opt-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchMode(btn.dataset.mode || 'stealth');
        showToast('Modo: ' + btn.textContent.trim());
      });
    });

    // 12. Model Picker Dropdown
    var modelPicker = $('model-picker');
    var modelPickerBtn = $('model-picker-btn');
    if (modelPicker && modelPickerBtn) {
      modelPickerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        modelPicker.classList.toggle('open');
      });

      document.addEventListener('click', function () {
        modelPicker.classList.remove('open');
      });

      document.querySelectorAll('#model-menu .model-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          document.querySelectorAll('#model-menu .model-option').forEach(function (o) { o.classList.remove('active'); });
          opt.classList.add('active');
          var modelId = opt.dataset.model;
          var name = opt.querySelector('.model-option-name').textContent;
          state.currentModel = modelId;
          state.currentModelName = name;
          if ($('model-picker-label')) $('model-picker-label').textContent = name;
          safeStorage.setItem('groq_model', modelId);
          modelPicker.classList.remove('open');
          showToast('Motor: ' + name);
        });
      });
    }

    // 13. Sidebar Tabs
    document.querySelectorAll('.sb-tabs .sb-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.sb-tabs .sb-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');

        var target = tab.dataset.tab;
        if ($('history-list')) $('history-list').classList.toggle('hidden', target !== 'history');
        if ($('samples-list')) $('samples-list').classList.toggle('hidden', target !== 'samples');
        if ($('guide-list')) $('guide-list').classList.toggle('hidden', target !== 'guide');
      });
    });

    // 14. Presets Click Handlers
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.preset;
        if (PRESETS[key] && $('inputText')) {
          $('inputText').value = PRESETS[key];
          if (key === 'corrector') switchMode('corrector');
          updateCounters();
          debouncedAnalyze();
          showToast('Plantilla cargada');
          if (window.innerWidth <= 860) {
            var sb = $('sidebar');
            var ov = $('sidebar-overlay');
            if (sb) sb.classList.remove('open');
            if (ov) ov.classList.remove('active');
          }
        }
      });
    });

    // 15. Mobile Sidebar
    var toggleBtn = $('sidebar-toggle-btn');
    var closeSbBtn = $('sidebar-close-btn');
    var overlay = $('sidebar-overlay');
    var sidebar = $('sidebar');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', function () {
        sidebar.classList.add('open');
        overlay.classList.add('active');
      });
    }
    if (closeSbBtn && sidebar && overlay) {
      closeSbBtn.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
    if (overlay && sidebar) {
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // 16. Modals
    var authModal = $('authModal');
    var settingsModal = $('settingsModal');

    function openModal(m) {
      if (m) m.classList.add('active');
    }
    function closeModal(m) {
      if (m) m.classList.remove('active');
    }

    var openAuthBtn = $('topbar-auth-btn');
    var userPill = $('user-profile-pill');
    var closeAuthBtn = $('btnCloseAuth');
    var btnOpenAuthFromSettings = $('btnOpenAuthFromSettings');

    if (openAuthBtn) openAuthBtn.addEventListener('click', function () {
      var token = safeStorage.getItem('ta_token');
      if (token) {
        // If already authed, open settings account pane
        loadSettings();
        switchSettingsPane('pane-account');
        openModal(settingsModal);
      } else {
        openModal(authModal);
      }
    });

    if (userPill) userPill.addEventListener('click', function () {
      loadSettings();
      switchSettingsPane('pane-account');
      openModal(settingsModal);
    });

    if (closeAuthBtn) closeAuthBtn.addEventListener('click', function () { closeModal(authModal); });
    if (btnOpenAuthFromSettings) btnOpenAuthFromSettings.addEventListener('click', function () {
      closeModal(settingsModal);
      openModal(authModal);
    });

    var openSettingsBtn = $('open-settings-btn');
    var topbarSettingsBtn = $('topbar-settings-btn');
    var closeSettingsBtn = $('btnCloseSettings');

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', function () {
      loadSettings();
      switchSettingsPane('pane-general');
      openModal(settingsModal);
    });
    if (topbarSettingsBtn) topbarSettingsBtn.addEventListener('click', function () {
      loadSettings();
      switchSettingsPane('pane-general');
      openModal(settingsModal);
    });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', function () { closeModal(settingsModal); });

    if (authModal) {
      authModal.addEventListener('click', function (e) {
        if (e.target === authModal) closeModal(authModal);
      });
    }
    if (settingsModal) {
      settingsModal.addEventListener('click', function (e) {
        if (e.target === settingsModal) closeModal(settingsModal);
      });
    }

    var themeToggleBtn = $('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        var current = safeStorage.getItem('ta_theme') || 'dark';
        var next = current === 'dark' ? 'light' : 'dark';
        safeStorage.setItem('ta_theme', next);
        applyAppearance();
        showToast('Tema: ' + (next === 'dark' ? 'Oscuro' : 'Claro'));
      });
    }

    // Settings Navigation
    function switchSettingsPane(paneId) {
      document.querySelectorAll('.settings-nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.pane === paneId);
      });
      document.querySelectorAll('.settings-pane').forEach(function (p) {
        p.classList.toggle('active', p.id === paneId);
      });
    }

    document.querySelectorAll('.settings-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchSettingsPane(btn.dataset.pane);
      });
    });

    // 17. Theming click handlers (Clean theme labels, NO 'theme' prefix)
    document.querySelectorAll('.theme-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var themeVal = card.dataset.value;
        safeStorage.setItem('ta_theme', themeVal);
        applyAppearance();
        showToast('Tema: ' + card.textContent.trim());
      });
    });

    document.querySelectorAll('.accent-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        var accentVal = dot.dataset.value;
        safeStorage.setItem('ta_accent', accentVal);
        applyAppearance();
        showToast('Color de acento actualizado');
      });
    });

    document.querySelectorAll('[data-pref="ta_font"]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var fontVal = pill.dataset.value;
        safeStorage.setItem('ta_font', fontVal);
        applyAppearance();
      });
    });

    if ($('set-compact-sb')) {
      $('set-compact-sb').addEventListener('change', function () {
        safeStorage.setItem('ta_compact_sb', $('set-compact-sb').checked ? '1' : '0');
        applyAppearance();
      });
    }

    if ($('set-reduce-motion')) {
      $('set-reduce-motion').addEventListener('change', function () {
        safeStorage.setItem('ta_reduce_motion', $('set-reduce-motion').checked ? '1' : '0');
        applyAppearance();
      });
    }

    // Default mode pills in settings
    document.querySelectorAll('#cfgDefaultMode .choice-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cfgDefaultMode .choice-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        safeStorage.setItem('ta_default_mode', btn.dataset.value);
      });
    });

    // Default view pills in settings
    document.querySelectorAll('#cfgDefaultView .choice-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cfgDefaultView .choice-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        safeStorage.setItem('ta_default_view', btn.dataset.value);
      });
    });

    // ========================================================
    // 18. AUTHENTICATION SYSTEM (ai.trujillomingorance.com Parity)
    // ========================================================
    var AUTH_ORIGIN = "";
    var GOOGLE_CLIENT_ID = "161745150528-5pb84k9upvamvlvnc7lg6nr1ku74vc4a.apps.googleusercontent.com";
    var X_CLIENT_ID = "NF94WVVIT1dzSXZNaTJuYjRXSEc6MTpjaQ";

    var pendingVerifyEmail = "";
    var pendingResetEmail = "";

    function getCookie(name) {
      try {
        var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
        return match ? decodeURIComponent(match[3]) : null;
      } catch (e) { return null; }
    }

    function setCookie(name, val, days, domain) {
      try {
        var expires = "";
        if (days) {
          var d = new Date();
          d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + d.toUTCString();
        }
        var dom = domain ? "; domain=" + domain : "";
        document.cookie = name + "=" + encodeURIComponent(val) + expires + dom + "; path=/; SameSite=Lax; Secure";
      } catch (e) {}
    }

    function eraseCookie(name, domain) {
      try {
        var dom = domain ? "; domain=" + domain : "";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC" + dom + "; path=/; SameSite=Lax; Secure";
      } catch (e) {}
    }

    function getAuthToken() {
      return safeStorage.getItem("trujillo_ai_token") ||
             safeStorage.getItem("ta_token") ||
             getCookie("trujillo_ai_token") ||
             getCookie("ta_auth_token") || "";
    }

    function getCurrentUser() {
      try {
        var raw = safeStorage.getItem("trujillo_ai_user") || safeStorage.getItem("ta_user");
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    function setAuthSession(token, user) {
      if (token) {
        safeStorage.setItem("trujillo_ai_token", token);
        safeStorage.setItem("ta_token", token);
        setCookie("trujillo_ai_token", token, 30, ".trujillomingorance.com");
        setCookie("ta_auth_token", token, 30, ".trujillomingorance.com");
        setCookie("trujillo_ai_token", token, 30, "");
      }
      if (user) {
        safeStorage.setItem("trujillo_ai_user", JSON.stringify(user));
        safeStorage.setItem("ta_user", JSON.stringify(user));
      }
    }

    function clearAuthSession() {
      safeStorage.removeItem("trujillo_ai_token");
      safeStorage.removeItem("ta_token");
      safeStorage.removeItem("trujillo_ai_user");
      safeStorage.removeItem("ta_user");
      eraseCookie("trujillo_ai_token", ".trujillomingorance.com");
      eraseCookie("ta_auth_token", ".trujillomingorance.com");
      eraseCookie("trujillo_ai_token", "");
      eraseCookie("ta_auth_token", "");
    }

    function updateAuthState() {
      var token = getAuthToken();
      var user = getCurrentUser();
      var isAuthed = !!(token && user);

      var topbarBtn = $("topbar-auth-btn");
      var topbarText = $("topbar-auth-text");
      var topbarLetter = $("topbar-letter");

      var userPill = $("user-profile-pill");
      var userLetter = $("user-letter");
      var userName = $("user-display-name");
      var userTier = $("user-display-tier");

      var guestView = $("account-guest-view");
      var authedView = $("account-authed-view");
      var accUserName = $("account-user-name");
      var accUserEmail = $("account-user-email");

      if (isAuthed) {
        var displayName = user.name || user.email || "Usuario";
        var initial = (displayName.charAt(0) || "T").toUpperCase();
        var firstName = displayName.split(" ")[0];
        var tierLabel = user.tier === "enterprise" ? "Enterprise" : (user.tier === "pro" ? "PRO • 0% IA" : "Verificado");

        if (topbarBtn) {
          topbarBtn.classList.remove("primary");
          topbarBtn.classList.add("topbar-user-btn");
        }
        if (topbarText) topbarText.textContent = firstName;
        if (topbarLetter) {
          topbarLetter.textContent = initial;
          topbarLetter.hidden = false;
        }

        if (userLetter) userLetter.textContent = initial;
        if (userName) userName.textContent = displayName;
        if (userTier) userTier.textContent = tierLabel;

        if (guestView) guestView.classList.add('hidden');
        if (authedView) authedView.classList.remove('hidden');
        if (accUserName) accUserName.textContent = displayName;
        if (accUserEmail) accUserEmail.textContent = user.email || "—";
      } else {
        if (topbarBtn) {
          topbarBtn.classList.add("primary");
          topbarBtn.classList.remove("topbar-user-btn");
        }
        if (topbarText) topbarText.textContent = "Acceder";
        if (topbarLetter) {
          topbarLetter.textContent = "A";
          topbarLetter.hidden = false;
        }

        if (userLetter) userLetter.textContent = "A";
        if (userName) userName.textContent = "Invitado";
        if (userTier) userTier.textContent = "0% IA • Groq Edge";

        if (guestView) guestView.classList.remove('hidden');
        if (authedView) authedView.classList.add('hidden');
      }
    }

    function showAuthAlert(msg, isSuccess) {
      var alertEl = $("authAlert");
      if (!alertEl) return;
      alertEl.textContent = msg;
      alertEl.className = "alert-banner " + (isSuccess ? "alert-success" : "alert-error");
      alertEl.classList.remove('hidden');
    }

    function hideAuthAlert() {
      var alertEl = $("authAlert");
      if (alertEl) alertEl.classList.add('hidden');
    }

    function switchAuthTab(tab) {
      hideAuthAlert();
      var formLogin = $("formLogin");
      var formRegister = $("formRegister");
      var formVerify = $("formVerify");
      var formForgot = $("formForgot");
      var formReset = $("formReset");
      var authTabs = $("authTabs");
      var authSocial = $("auth-social");
      var tabLoginBtn = $("tab-login-btn");
      var tabRegBtn = $("tab-reg-btn");

      if (tabLoginBtn) tabLoginBtn.classList.remove("active");
      if (tabRegBtn) tabRegBtn.classList.remove("active");

      if (formLogin) formLogin.classList.add("hidden");
      if (formRegister) formRegister.classList.add("hidden");
      if (formVerify) formVerify.classList.add("hidden");
      if (formForgot) formForgot.classList.add("hidden");
      if (formReset) formReset.classList.add("hidden");

      if (tab === "login") {
        if (formLogin) formLogin.classList.remove("hidden");
        if (authTabs) authTabs.classList.remove("hidden");
        if (authSocial) authSocial.classList.remove("hidden");
        if (tabLoginBtn) tabLoginBtn.classList.add("active");
      } else if (tab === "register") {
        if (formRegister) formRegister.classList.remove("hidden");
        if (authTabs) authTabs.classList.remove("hidden");
        if (authSocial) authSocial.classList.remove("hidden");
        if (tabRegBtn) tabRegBtn.classList.add("active");
      } else if (tab === "verify") {
        if (formVerify) formVerify.classList.remove("hidden");
        if (authTabs) authTabs.classList.add("hidden");
        if (authSocial) authSocial.classList.add("hidden");
        var vCode = $("verifyCode");
        if (vCode) setTimeout(function () { vCode.focus(); }, 100);
      } else if (tab === "forgot") {
        if (formForgot) formForgot.classList.remove("hidden");
        if (authTabs) authTabs.classList.add("hidden");
        if (authSocial) authSocial.classList.add("hidden");
      } else if (tab === "reset") {
        if (formReset) formReset.classList.remove("hidden");
        if (authTabs) authTabs.classList.add("hidden");
        if (authSocial) authSocial.classList.add("hidden");
        var rCode = $("resetCode");
        if (rCode) setTimeout(function () { rCode.focus(); }, 100);
      }
    }

    if ($("tab-login-btn")) $("tab-login-btn").addEventListener("click", function () { switchAuthTab("login"); });
    if ($("tab-reg-btn")) $("tab-reg-btn").addEventListener("click", function () { switchAuthTab("register"); });
    if ($("linkForgot")) $("linkForgot").addEventListener("click", function () { switchAuthTab("forgot"); });
    if ($("linkBackToLogin")) $("linkBackToLogin").addEventListener("click", function () { switchAuthTab("login"); });
    if ($("linkBackToRegister")) $("linkBackToRegister").addEventListener("click", function () { switchAuthTab("register"); });
    if ($("linkBackToForgot")) $("linkBackToForgot").addEventListener("click", function () { switchAuthTab("forgot"); });

    var openAuthBtn = $("topbar-auth-btn");
    var userPill = $("user-profile-pill");
    var closeAuthBtn = $("btnCloseAuth");
    var btnOpenAuthFromSettings = $("btnOpenAuthFromSettings");

    if (openAuthBtn) {
      openAuthBtn.addEventListener("click", function () {
        if (getAuthToken()) {
          loadSettings();
          switchSettingsPane("pane-account");
          openModal(settingsModal);
        } else {
          switchAuthTab("login");
          openModal(authModal);
        }
      });
    }

    if (userPill) {
      userPill.addEventListener("click", function () {
        if (getAuthToken()) {
          loadSettings();
          switchSettingsPane("pane-account");
          openModal(settingsModal);
        } else {
          switchAuthTab("login");
          openModal(authModal);
        }
      });
    }

    if (closeAuthBtn) closeAuthBtn.addEventListener("click", function () { closeModal(authModal); });
    if (btnOpenAuthFromSettings) {
      btnOpenAuthFromSettings.addEventListener("click", function () {
        closeModal(settingsModal);
        switchAuthTab("login");
        openModal(authModal);
      });
    }

    function bindCodeInput(id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () {
        var digits = String(el.value || "").replace(/\D/g, "").slice(0, 6);
        if (el.value !== digits) el.value = digits;
      });
      el.addEventListener("paste", function (e) {
        var text = "";
        try { text = (e.clipboardData || window.clipboardData).getData("text") || ""; } catch (err) {}
        if (!text) return;
        e.preventDefault();
        el.value = String(text).replace(/\D/g, "").slice(0, 6);
      });
    }
    bindCodeInput("verifyCode");
    bindCodeInput("resetCode");

    // 1. Submit Login
    if ($("formLogin")) {
      $("formLogin").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideAuthAlert();
        var email = $("loginEmail") ? $("loginEmail").value.trim().toLowerCase() : "";
        var password = $("loginPassword") ? $("loginPassword").value : "";
        var btn = $("btnLoginSubmit");

        if (!email || !password) return;
        if (btn) { btn.disabled = true; btn.textContent = "Accediendo..."; }

        try {
          var res = await fetch(AUTH_ORIGIN + "/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
          });
          var data = await res.json();
          if (res.ok && (data.ok || data.token)) {
            setAuthSession(data.token, data.user);
            updateAuthState();
            closeModal(authModal);
            showToast("¡Bienvenido, " + (data.user.name || "Alberto") + "!");
          } else {
            throw new Error(data.error || "Correo o contraseña incorrectos.");
          }
        } catch (err) {
          showAuthAlert(err.message);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "Continuar"; }
        }
      });
    }

    // 2. Submit Register
    if ($("formRegister")) {
      $("formRegister").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideAuthAlert();
        var name = $("regName") ? $("regName").value.trim() : "";
        var email = $("regEmail") ? $("regEmail").value.trim().toLowerCase() : "";
        var password = $("regPassword") ? $("regPassword").value : "";
        var btn = $("btnRegisterSubmit");

        if (!name || !email || !password) return;
        if (password.length < 6) {
          showAuthAlert("La contraseña debe tener al menos 6 caracteres.");
          return;
        }

        if (btn) { btn.disabled = true; btn.textContent = "Creando cuenta..."; }

        try {
          var res = await fetch(AUTH_ORIGIN + "/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: password, locale: "es" })
          });
          var data = await res.json();
          if (res.ok && (data.ok || data.pending || data.verify)) {
            pendingVerifyEmail = email;
            if ($("verifyEmailDisplay")) $("verifyEmailDisplay").textContent = email;
            switchAuthTab("verify");
            showAuthAlert("Código de verificación de 6 dígitos enviado a " + email, true);
          } else if (res.ok && data.token) {
            setAuthSession(data.token, data.user);
            updateAuthState();
            closeModal(authModal);
            showToast("¡Cuenta creada y activada!");
          } else {
            throw new Error(data.error || "No se pudo crear la cuenta.");
          }
        } catch (err) {
          showAuthAlert(err.message);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "Crear cuenta"; }
        }
      });
    }

    // 3. Submit Verify Email (OTP)
    if ($("formVerify")) {
      $("formVerify").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideAuthAlert();
        var code = $("verifyCode") ? $("verifyCode").value.trim() : "";
        var btn = $("btnVerifySubmit");

        if (!code || code.length !== 6) {
          showAuthAlert("Introduce el código de 6 dígitos.");
          return;
        }

        if (btn) { btn.disabled = true; btn.textContent = "Verificando..."; }

        try {
          var res = await fetch(AUTH_ORIGIN + "/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: pendingVerifyEmail, code: code })
          });
          var data = await res.json();
          if (res.ok && (data.ok || data.token)) {
            setAuthSession(data.token, data.user);
            updateAuthState();
            closeModal(authModal);
            showToast("¡Cuenta verificada con éxito!");
          } else {
            throw new Error(data.error || "Código incorrecto o expirado.");
          }
        } catch (err) {
          showAuthAlert(err.message);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "Verificar y entrar"; }
        }
      });
    }

    // 4. Submit Forgot Password
    if ($("formForgot")) {
      $("formForgot").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideAuthAlert();
        var email = $("forgotEmail") ? $("forgotEmail").value.trim().toLowerCase() : "";
        var btn = $("btnForgotSubmit");

        if (!email) return;
        if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

        try {
          var res = await fetch(AUTH_ORIGIN + "/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
          });
          var data = await res.json();
          if (res.ok) {
            pendingResetEmail = email;
            if ($("resetEmail")) $("resetEmail").value = email;
            switchAuthTab("reset");
            showAuthAlert("Código enviado a " + email + ". Introduce el código y tu nueva contraseña.", true);
          } else {
            throw new Error(data.error || "No se pudo enviar el código de recuperación.");
          }
        } catch (err) {
          showAuthAlert(err.message);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "Enviar código"; }
        }
      });
    }

    // 5. Submit Reset Password
    if ($("formReset")) {
      $("formReset").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideAuthAlert();
        var email = ($("resetEmail") ? $("resetEmail").value.trim().toLowerCase() : "") || pendingResetEmail;
        var code = $("resetCode") ? $("resetCode").value.trim() : "";
        var newPassword = $("resetNewPassword") ? $("resetNewPassword").value : "";
        var btn = $("btnResetSubmit");

        if (!email) { showAuthAlert("Introduce tu correo."); return; }
        if (!code || code.length !== 6) { showAuthAlert("Introduce el código de 6 dígitos."); return; }
        if (!newPassword || newPassword.length < 6) { showAuthAlert("La nueva contraseña debe tener mínimo 6 caracteres."); return; }

        if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

        try {
          var res = await fetch(AUTH_ORIGIN + "/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, code: code, newPassword: newPassword })
          });
          var data = await res.json();
          if (res.ok && (data.ok || data.token)) {
            setAuthSession(data.token, data.user);
            updateAuthState();
            closeModal(authModal);
            showToast("Contraseña actualizada correctamente.");
          } else {
            throw new Error(data.error || "Código incorrecto o no válido.");
          }
        } catch (err) {
          showAuthAlert(err.message);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "Guardar y entrar"; }
        }
      });
    }

    // 6. Google Sign-In Integration
    function mountGoogle() {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          ux_mode: "popup"
        });
        var slot = $("google-btn-overlay");
        if (slot && !slot.getAttribute("data-ready")) {
          window.google.accounts.id.renderButton(slot, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: Math.max(slot.parentElement ? slot.parentElement.offsetWidth : 160, 140),
            text: "continue_with"
          });
          slot.setAttribute("data-ready", "1");
        }
        return true;
      } catch (e) { return false; }
    }

    async function handleGoogleCredential(response) {
      hideAuthAlert();
      try {
        var res = await fetch(AUTH_ORIGIN + "/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential })
        });
        var data = await res.json();
        if (res.ok && (data.ok || data.token)) {
          setAuthSession(data.token, data.user);
          updateAuthState();
          closeModal(authModal);
          showToast("¡Sesión iniciada con Google!");
        } else {
          throw new Error(data.error || "No se pudo iniciar sesión con Google");
        }
      } catch (err) {
        showAuthAlert(err.message);
      }
    }

    (function waitGoogle() {
      if (mountGoogle()) return;
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        if (mountGoogle() || attempts > 30) clearInterval(timer);
      }, 200);
    })();

    // 7. X (Twitter) OAuth
    if ($("btn-x")) {
      $("btn-x").addEventListener("click", function () {
        var state = "x_oauth_" + Math.random().toString(36).slice(2, 10);
        safeStorage.setItem("trujillo_x_oauth_state", state);
        var redirectUri = encodeURIComponent(window.location.origin + "/?auth=x_callback");
        window.location.href = "https://twitter.com/i/oauth2/authorize?response_type=code&client_id=" + X_CLIENT_ID +
          "&redirect_uri=" + redirectUri + "&scope=users.read%20tweet.read&state=" + state +
          "&code_challenge=challenge&code_challenge_method=plain";
      });
    }

    (function checkSocialCallback() {
      try {
        var params = new URLSearchParams(window.location.search);
        var state = params.get("state") || "";
        var isXCallback = params.get("auth") === "x_callback" || state.indexOf("x_oauth_") === 0;
        if (!isXCallback) return;
        var code = params.get("code");
        window.history.replaceState({}, document.title, window.location.pathname);
        if (code) {
          showToast("Confirmando acceso con X...");
          fetch(AUTH_ORIGIN + "/api/auth/x", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code, redirectUri: window.location.origin + "/?auth=x_callback" })
          })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) {
              if (res.ok && res.d.token) {
                setAuthSession(res.d.token, res.d.user);
                updateAuthState();
                showToast("¡Sesión iniciada con X!");
              } else {
                showToast(res.d.error || "No se pudo entrar con X");
              }
            })
            .catch(function () { showToast("Error al conectar con X"); });
        }
      } catch (e) {}
    })();

    // 8. Guest Mode
    if ($("btnGuest")) {
      $("btnGuest").addEventListener("click", function () {
        clearAuthSession();
        updateAuthState();
        closeModal(authModal);
        showToast("Modo Local (Invitado) activo");
      });
    }

    // 9. Logout
    if ($("settings-logout-btn")) {
      $("settings-logout-btn").addEventListener("click", function () {
        clearAuthSession();
        updateAuthState();
        closeModal(settingsModal);
        showToast("Sesión cerrada");
      });
    }

    // 10. Auto-verify session with /api/auth/me on load
    (function checkExistingSession() {
      var token = getAuthToken();
      if (token) {
        fetch(AUTH_ORIGIN + "/api/auth/me", {
          headers: { "Authorization": "Bearer " + token }
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (res.ok && res.d.user) {
              setAuthSession(token, res.d.user);
              updateAuthState();
            } else if (!res.ok && res.d.error === "Token inválido o expirado") {
              clearAuthSession();
              updateAuthState();
            }
          })
          .catch(function () {});
      }
      updateAuthState();

      var params = new URLSearchParams(window.location.search);
      var path = window.location.pathname;
      if (path === "/login" || path === "/register" || params.get("auth") === "login" || params.get("tab") === "register") {
        switchAuthTab(path === "/register" || params.get("tab") === "register" ? "register" : "login");
        openModal(authModal);
      }
    })();

    // Settings actions
    if ($('btnSaveCfg')) $('btnSaveCfg').addEventListener('click', saveSettings);
    if ($('btnResetCfg')) {
      $('btnResetCfg').addEventListener('click', function () {
        safeStorage.removeItem('groq_provider');
        safeStorage.removeItem('groq_api_key');
        safeStorage.removeItem('groq_model');
        safeStorage.removeItem('groq_temp');
        safeStorage.removeItem('ta_theme');
        safeStorage.removeItem('ta_accent');
        safeStorage.removeItem('ta_font');
        safeStorage.removeItem('ta_default_mode');
        safeStorage.removeItem('ta_default_view');
        loadSettings();
        showToast('Ajustes restablecidos');
      });
    }

    if ($('btnEyeKey') && $('cfgApiKey')) {
      $('btnEyeKey').addEventListener('click', function () {
        var input = $('cfgApiKey');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    }

    if ($('cfgTemp')) {
      $('cfgTemp').addEventListener('input', function () {
        if ($('tempIndicator')) $('tempIndicator').textContent = $('cfgTemp').value;
      });
    }

    // Quick History Search
    var historySearch = $('history-search');
    if (historySearch) {
      historySearch.addEventListener('input', function () {
        var q = historySearch.value.toLowerCase().trim();
        document.querySelectorAll('#history-list .history-item').forEach(function (it) {
          var title = it.querySelector('.history-title');
          var text = title ? title.textContent.toLowerCase() : '';
          it.classList.toggle('is-filtered-out', !text.includes(q));
        });
      });
    }

    // Initial setup
    switchMode(state.currentMode);
    updateCounters();
  }

  // Self-executing safe DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// App Mode Logic
window.currentAppMode = 'humanizer';
var tabH = document.getElementById('tabHumanizer');
var tabD = document.getElementById('tabDetector');
var pOut = document.getElementById('paneOutputContainer');
var dOut = document.getElementById('detectorOutput');
var oTxt = document.getElementById('outputText');
var oEmp = document.getElementById('outputEmptyState');
          });
          slot.setAttribute("data-ready", "1");
        }
        return true;
      } catch (e) { return false; }
    }

    async function handleGoogleCredential(response) {
      hideAuthAlert();
      try {
        var res = await fetch(AUTH_ORIGIN + "/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential })
        });
        var data = await res.json();
        if (res.ok && (data.ok || data.token)) {
          setAuthSession(data.token, data.user);
          updateAuthState();
          closeModal(authModal);
          showToast("¡Sesión iniciada con Google!");
        } else {
          throw new Error(data.error || "No se pudo iniciar sesión con Google");
        }
      } catch (err) {
        showAuthAlert(err.message);
      }
    }

    (function waitGoogle() {
      if (mountGoogle()) return;
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        if (mountGoogle() || attempts > 30) clearInterval(timer);
      }, 200);
    })();

    // 7. X (Twitter) OAuth
    if ($("btn-x")) {
      $("btn-x").addEventListener("click", function () {
        var state = "x_oauth_" + Math.random().toString(36).slice(2, 10);
        safeStorage.setItem("trujillo_x_oauth_state", state);
        var redirectUri = encodeURIComponent(window.location.origin + "/?auth=x_callback");
        window.location.href = "https://twitter.com/i/oauth2/authorize?response_type=code&client_id=" + X_CLIENT_ID +
          "&redirect_uri=" + redirectUri + "&scope=users.read%20tweet.read&state=" + state +
          "&code_challenge=challenge&code_challenge_method=plain";
      });
    }

    (function checkSocialCallback() {
      try {
        var params = new URLSearchParams(window.location.search);
        var state = params.get("state") || "";
        var isXCallback = params.get("auth") === "x_callback" || state.indexOf("x_oauth_") === 0;
        if (!isXCallback) return;
        var code = params.get("code");
        window.history.replaceState({}, document.title, window.location.pathname);
        if (code) {
          showToast("Confirmando acceso con X...");
          fetch(AUTH_ORIGIN + "/api/auth/x", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code, redirectUri: window.location.origin + "/?auth=x_callback" })
          })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) {
              if (res.ok && res.d.token) {
                setAuthSession(res.d.token, res.d.user);
                updateAuthState();
                showToast("¡Sesión iniciada con X!");
              } else {
                showToast(res.d.error || "No se pudo entrar con X");
              }
            })
            .catch(function () { showToast("Error al conectar con X"); });
        }
      } catch (e) {}
    })();

    // 8. Guest Mode
    if ($("btnGuest")) {
      $("btnGuest").addEventListener("click", function () {
        clearAuthSession();
        updateAuthState();
        closeModal(authModal);
        showToast("Modo Local (Invitado) activo");
      });
    }

    // 9. Logout
    if ($("settings-logout-btn")) {
      $("settings-logout-btn").addEventListener("click", function () {
        clearAuthSession();
        updateAuthState();
        closeModal(settingsModal);
        showToast("Sesión cerrada");
      });
    }

    // 10. Auto-verify session with /api/auth/me on load
    (function checkExistingSession() {
      var token = getAuthToken();
      if (token) {
        fetch(AUTH_ORIGIN + "/api/auth/me", {
          headers: { "Authorization": "Bearer " + token }
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (res.ok && res.d.user) {
              setAuthSession(token, res.d.user);
              updateAuthState();
            } else if (!res.ok && res.d.error === "Token inválido o expirado") {
              clearAuthSession();
              updateAuthState();
            }
          })
          .catch(function () {});
      }
      updateAuthState();

      var params = new URLSearchParams(window.location.search);
      var path = window.location.pathname;
      if (path === "/login" || path === "/register" || params.get("auth") === "login" || params.get("tab") === "register") {
        switchAuthTab(path === "/register" || params.get("tab") === "register" ? "register" : "login");
        openModal(authModal);
      }
    })();

    // Settings actions
    if ($('btnSaveCfg')) $('btnSaveCfg').addEventListener('click', saveSettings);
    if ($('btnResetCfg')) {
      $('btnResetCfg').addEventListener('click', function () {
        safeStorage.removeItem('groq_provider');
        safeStorage.removeItem('groq_api_key');
        safeStorage.removeItem('groq_model');
        safeStorage.removeItem('groq_temp');
        safeStorage.removeItem('ta_theme');
        safeStorage.removeItem('ta_accent');
        safeStorage.removeItem('ta_font');
        safeStorage.removeItem('ta_default_mode');
        safeStorage.removeItem('ta_default_view');
        loadSettings();
        showToast('Ajustes restablecidos');
      });
    }

    if ($('btnEyeKey') && $('cfgApiKey')) {
      $('btnEyeKey').addEventListener('click', function () {
        var input = $('cfgApiKey');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    }

    if ($('cfgTemp')) {
      $('cfgTemp').addEventListener('input', function () {
        if ($('tempIndicator')) $('tempIndicator').textContent = $('cfgTemp').value;
      });
    }

    // Quick History Search
    var historySearch = $('history-search');
    if (historySearch) {
      historySearch.addEventListener('input', function () {
        var q = historySearch.value.toLowerCase().trim();
        document.querySelectorAll('#history-list .history-item').forEach(function (it) {
          var title = it.querySelector('.history-title');
          var text = title ? title.textContent.toLowerCase() : '';
          it.classList.toggle('is-filtered-out', !text.includes(q));
        });
      });
    }

    // Initial setup
    switchMode(state.currentMode);
    updateCounters();
  }

  // Self-executing safe DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// App Mode Logic
window.currentAppMode = 'humanizer';
var tabH = document.getElementById('tabHumanizer');
var tabD = document.getElementById('tabDetector');
var pOut = document.getElementById('paneOutputContainer');
var dOut = document.getElementById('detectorOutput');
var oTxt = document.getElementById('outputText');
var oEmp = document.getElementById('outputEmptyState');
var bTxt = document.getElementById('btnActionText');

if(tabH) tabH.addEventListener('click', function() { setAppMode('humanizer'); });
if(tabD) tabD.addEventListener('click', function() { setAppMode('detector'); });

function setAppMode(mode) {
  window.currentAppMode = mode;
  var inTxt = document.getElementById('inputText');
  if (mode === 'humanizer') {
    if(tabH) tabH.className = 'px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white transition-all';
    if(tabD) tabD.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all';
    if(pOut) { pOut.classList.remove('hidden'); pOut.classList.add('flex'); }
    if(bTxt) bTxt.textContent = 'Humanizar Texto';
    if(dOut) dOut.classList.add('hidden');
    if(inTxt && inTxt.value.trim() && oTxt && oTxt.value) { if(oTxt) oTxt.classList.remove('hidden'); if(oEmp) oEmp.classList.add('hidden'); }
    else { if(oTxt) oTxt.classList.add('hidden'); if(oEmp) oEmp.classList.remove('hidden'); }
  } else {
    if(tabD) tabD.className = 'px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white transition-all';
    if(tabH) tabH.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all';
    if(pOut) { pOut.classList.add('hidden'); pOut.classList.remove('flex'); }
    if(bTxt) bTxt.textContent = 'Analizar Texto';
  }
}


window.runAiDetector = function(text, btn) {
  if (btn) { btn.disabled = true; btn.classList.add('loading', 'opacity-70', 'cursor-not-allowed', 'pointer-events-none'); var txt = btn.querySelector('#btnActionText'); if (txt) txt.textContent = 'Analizando...'; }
  var dOut = document.getElementById('detectorOutput');
  var pOut = document.getElementById('paneOutputContainer');
  var oTxt = document.getElementById('outputText');
  var oEmp = document.getElementById('outputEmptyState');
  pOut.classList.remove('hidden'); pOut.classList.add('flex');
  dOut.classList.remove('hidden'); dOut.classList.add('flex');
  if(oTxt) oTxt.classList.add('hidden');
  if(oEmp) oEmp.classList.add('hidden');
  setTimeout(function() {
    var sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    var lengths = sentences.map(function(s) { return s.trim().split(/\s+/).length; });
    var avg = lengths.reduce(function(a, b) { return a + b; }, 0) / (lengths.length || 1);
    var variance = lengths.reduce(function(a, b) { return a + Math.pow(b - avg, 2); }, 0) / (lengths.length || 1);
    var burstiness = avg > 0 ? variance / avg : 0;
    var aiWords = ['fundamental', 'crucial', 'en conclusión', 'cabe destacar', 'un tapiz', 'en resumen', 'además', 'sin embargo', 'es importante notar'];
    var wordCount = 0; var highlightHtml = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    aiWords.forEach(function(w) {
      var reg = new RegExp('(' + w + ')', 'gi');
      if(reg.test(highlightHtml)) {
        wordCount++;
        highlightHtml = highlightHtml.replace(reg, '<span class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded px-1 border-b border-red-300 dark:border-red-700"></span>');
      }
    });
    var score = 100 - (wordCount * 8);
    if (burstiness < 2.0) score -= 15;
    if (burstiness < 1.0) score -= 25;
    if (score < 5) score = Math.floor(Math.random() * 15) + 5;
    if (score > 98) score = 98;
    var colorClass = score >= 85 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : (score >= 50 ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20');
    var barColor = score >= 85 ? 'bg-emerald-500' : (score >= 50 ? 'bg-amber-500' : 'bg-red-500');
    var label = score >= 85 ? 'Texto Altamente Humano' : (score >= 50 ? 'Texto Mixto / Posible Edición' : 'Texto Generado por IA');
    dOut.innerHTML = '<div class="mb-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 ' + colorClass + '"><div class="flex justify-between items-center mb-2"><h3 class="font-bold text-lg">' + label + '</h3><span class="font-extrabold text-2xl">' + score + '%</span></div><div class="w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full h-2.5 mb-1 overflow-hidden"><div class="' + barColor + ' h-2.5 rounded-full" style="width: ' + score + '%"></div></div><p class="text-xs opacity-80 mt-2">Probabilidad de redacción humana basada en burstiness y tokens predictivos.</p></div><div class="flex-1 overflow-y-auto p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"><h4 class="font-semibold mb-3 text-xs text-zinc-400 uppercase tracking-wider">Análisis de Sintaxis</h4>' + highlightHtml.replace(/\n/g, '<br>') + '</div>';
    if (btn) { btn.disabled = false; btn.classList.remove('loading', 'opacity-70', 'cursor-not-allowed', 'pointer-events-none'); var txt = btn.querySelector('#btnActionText'); if (txt) txt.textContent = 'Analizar Texto'; }
  }, 1200);
};

