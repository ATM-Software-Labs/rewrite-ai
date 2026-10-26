/**
 * Cloudflare Pages Function: /api/rewrite
 * Proxy de streaming para la reescritura de textos
 * Groq LPU fallback ladder + Cloudflare Workers AI
 * Style.md calibration + sentence-level burstiness
 */

import { corsFor, guard, tooLong, MAX_CHARS } from '../lib/guard.js';

const BANNED_AI_WORDS_EN = [
  'delve', 'testament', 'tapestry', 'beacon', 'multifaceted', 'crucial', 
  'paramount', 'realm', 'moreover', 'furthermore', 'in conclusion', 'embark', 
  'pivotal', 'underscores', 'encompasses', 'vibrant', 'notably', 'it is important to note',
  'seamless', 'fostering', 'holistic', 'interplay', 'cornerstone', 'in today\'s fast-paced world',
  'navigating the landscape', 'plays a crucial role', 'shedding light'
];

const BANNED_AI_WORDS_ES = [
  'sumergirse', 'tapiz', 'testimonio', 'crucial', 'en conclusión', 
  'es fundamental destacar', 'cabe señalar', 'desempeña un papel', 'a fin de cuentas', 
  'por consiguiente', 'un sinfín de', 'no solo', 'sino también', 'vital', 'primordial',
  'en este sentido', 'vale la pena señalar', 'en el ámbito de', 'un abanico de',
  'en resumen', 'es de vital importancia', 'cobra especial relevancia', 'sentar las bases'
];

// Groq Model Fallback Ladder (Fastest & highest entropy first)
// Solo modelos disponibles para la clave de Groq (GET /openai/v1/models, oct 2026).
// Workers AI queda como último recurso para no gastar la cuota de Cloudflare.
const GROQ_MODEL_LADDER = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];
// Modelo pequeño y barato para correcciones cortas
const GROQ_FAST_MODEL = 'openai/gpt-oss-20b';

// gpt-oss y qwen3 son modelos de razonamiento: ocultamos el razonamiento para recibir solo el texto
// El razonamiento consume max_tokens, así que se suma un margen para que no se quede sin texto
function groqReasoningOpts(model, maxTokens) {
  if (model.startsWith('openai/gpt-oss')) return { reasoning_format: 'hidden', reasoning_effort: 'low', max_tokens: maxTokens + 1024 };
  if (model.startsWith('qwen/')) return { reasoning_format: 'hidden', max_tokens: maxTokens + 1024 };
  return { max_tokens: maxTokens };
}


function detectTextLanguage(text) {
  if (!text) return 'es';
  const sample = text.toLowerCase();
  
  const enWords = [
    'the', 'and', 'is', 'of', 'to', 'in', 'with', 'for', 'on', 'by', 'this', 'that', 
    'from', 'at', 'an', 'as', 'are', 'be', 'system', 'buffer', 'alerts', 'lockdown', 
    'local', 'data', 'user', 'project', 'repo', 'description', 'released', 'license',
    'strictly', 'forensic', 'workstation', 'overload', 'under', 'boot', 'ring'
  ];
  const esWords = [
    'el', 'la', 'los', 'las', 'de', 'en', 'que', 'un', 'una', 'para', 'por', 'con', 
    'del', 'al', 'es', 'su', 'este', 'esta', 'como', 'más', 'pero', 'sistema', 
    'descripción', 'enlace', 'almacenado', 'pantalla', 'seguridad', 'informe'
  ];

  let enCount = 0;
  let esCount = 0;

  const tokens = sample.split(/[\s,.;:!?()\[\]"']+/).filter(Boolean);
  for (const t of tokens) {
    if (enWords.includes(t)) enCount++;
    if (esWords.includes(t)) esCount++;
  }

  if (enCount > esCount) return 'en';
  if (esCount > enCount) return 'es';
  if (/[áéíóúüñ¿¡]/.test(sample)) return 'es';
  return 'es';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = corsFor(request, {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  });

  const blocked = guard(request, corsHeaders);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const {
      text,
      mode = 'stealth',
      stylePreset = 'natural',
      aggressiveness = 'extreme',
      language = 'auto',
      provider = 'groq',
      apiKey = '',
      model = '',
      stream = false,
      styleGuide = '',
      calibration = null,
      targetLang = 'en'
    } = body;

    if (!text || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'El texto debe contener al menos 5 caracteres.' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    if (tooLong(text)) {
      return new Response(JSON.stringify({ error: `El texto es demasiado largo (máximo ${MAX_CHARS} caracteres).` }), {
        status: 413,
        headers: corsHeaders
      });
    }

    const detectedLang = language === 'auto' ? detectTextLanguage(text) : language;
    const isEnglish = detectedLang === 'en';

    const { systemPrompt, userPrompt } = mode === 'translate'
      ? buildTranslatePrompts(text, targetLang)
      : buildPrompts(mode, stylePreset, isEnglish, text, styleGuide, calibration);
    const wordCount = text.trim().split(/\s+/).length;
    // Modelo rápido (8B) para correcciones cortas; 70B para reescribir y traducir
    const cfModel = (mode === 'corrector' && wordCount <= 300) ? '@cf/meta/llama-3.1-8b-instruct-fast' : (env.DEFAULT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    // Tope de tokens proporcional al texto (≈2 tokens por palabra +20 % de margen) para que Reescribir no se alargue
    const maxTokens = mode === 'stealth' ? Math.min(3500, Math.max(160, Math.ceil(wordCount * 2.0 * 1.2) + 40)) : 3500;
    const temperature = mode === 'corrector' ? 0.3 : mode === 'translate' ? 0.4 : 0.7;

    const effectiveGroqKey = apiKey || env.GROQ_API_KEY || '';

    // Groq primero (si hay clave) con su escalera de modelos; Workers AI solo como último recurso
    const groqModel = model || ((mode === 'corrector' && wordCount <= 300) ? GROQ_FAST_MODEL : '');

    // --- STREAMING MODE (SSE) ---
    if (stream && provider === 'groq' && effectiveGroqKey) {
      try {
        return await callGroqStream(userPrompt, systemPrompt, effectiveGroqKey, groqModel, text, temperature, maxTokens, corsFor(request));
      } catch (streamErr) {
        console.error('Groq stream failed, falling back:', streamErr);
        try {
          const groqRes = await callGroqWithLadder(userPrompt, systemPrompt, effectiveGroqKey, groqModel, temperature, maxTokens);
          return sseFromText(stripMarkdown(cleanModelOutput(groqRes.text)), `Groq LPU (${groqRes.model})`, corsFor(request));
        } catch (ladderErr) {
          console.error('Groq ladder failed, using Workers AI:', ladderErr);
        }
      }
    }
    if (stream && env.AI) {
      try {
        const msgs = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
        const aiStream = await env.AI.run(cfModel, { messages: msgs, temperature, top_p: 0.95, max_tokens: maxTokens, stream: true });
        // Reescribir: solo si sale anormalmente truncado (<40 % de palabras), se regenera una vez
        const inWords = text.replace(/[*#>_`-]+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        const lengthCheck = mode === 'stealth' && stylePreset !== 'executive' && inWords >= 40;
        const retry = lengthCheck ? async (got) => {
          const targetWords = Math.round(inWords * 0.75);
          const fix = isEnglish
            ? 'Your version has only ' + got + ' words and was cut off. Rewrite the ORIGINAL text completely in around ' + targetWords + ' words, keeping all facts, figures, and key ideas in a natural, concise human voice. Return only the text.'
            : 'Tu versión tiene solo ' + got + ' palabras y quedó incompleta. Vuelve a reescribir el texto ORIGINAL completo en unas ' + targetWords + ' palabras, conservando todos los datos, cifras e ideas clave de forma natural, concisa y humana. Devuelve solo el texto.';
          return env.AI.run(cfModel, { messages: msgs.concat([{ role: 'user', content: fix }]), temperature: 0.7, top_p: 0.95, max_tokens: Math.min(3500, Math.ceil(inWords * 2.0) + 60), stream: true });
        } : null;
        return new Response(workersAiToSse(aiStream, cfModel, retry ? { minWords: Math.round(inWords * 0.40), retry } : null), {
          headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...corsFor(request) }
        });
      } catch (e) {
        console.error('Workers AI stream failed, falling back:', e);
      }
    }
    // --- SYNCHRONOUS MODE ---
    let humanizedText = '';
    let usedProvider = provider;

    let groqFailed = false;
    if (provider === 'groq' && effectiveGroqKey) {
      try {
        const groqRes = await callGroqWithLadder(userPrompt, systemPrompt, effectiveGroqKey, groqModel, temperature, maxTokens);
        humanizedText = groqRes.text;
        usedProvider = `Groq LPU (${groqRes.model})`;
      } catch (groqErr) {
        console.error('Groq ladder failed, using Workers AI:', groqErr);
        groqFailed = true;
      }
    }
    if (humanizedText) {
      // Groq respondió
    } else if (provider === 'openai' && apiKey) {
      humanizedText = await callOpenAI(userPrompt, systemPrompt, apiKey, model || 'gpt-4o-mini');
      usedProvider = 'OpenAI';
    } else if (env.AI) {
      const modelName = cfModel;
      let aiResponse;
      try {
        aiResponse = await env.AI.run(modelName, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: mode === 'corrector' ? 0.3 : 0.7,
          top_p: 0.95,
          max_tokens: 3500
        });
      } catch (aiErr) {
        aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: mode === 'corrector' ? 0.3 : 0.7,
          max_tokens: 3500
        });
      }
      humanizedText = aiResponse.response || aiResponse.text || '';
      usedProvider = `Cloudflare Workers AI (${modelName})`;
    } else if (effectiveGroqKey && !groqFailed) {
      const groqRes = await callGroqWithLadder(userPrompt, systemPrompt, effectiveGroqKey, groqModel, temperature, maxTokens);
      humanizedText = groqRes.text;
      usedProvider = `Groq LPU (${groqRes.model})`;
    } else {
      humanizedText = fallbackHeuristicHumanizer(text, mode);
      usedProvider = 'Rule-Based Engine (Local)';
    }

    humanizedText = stripMarkdown(cleanModelOutput(humanizedText));

    const originalMetrics = calculateMetrics(text);
    const humanizedMetrics = calculateMetrics(humanizedText);

    return new Response(JSON.stringify({
      success: true,
      original: text,
      humanized: humanizedText,
      provider: usedProvider,
      mode,
      language: detectedLang,
      metrics: {
        original: originalMetrics,
        humanized: humanizedMetrics
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error procesando la humanización: ' + error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsFor(request, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    })
  });
}

function buildStyleBlock(styleGuide, calibration) {
  const parts = [];
  if (styleGuide && String(styleGuide).trim()) {
    parts.push(
      'AUTHOR STYLE GUIDE (imported style.md — match voice, diction, and rhythm; do not quote this block):\n' +
      String(styleGuide).trim().slice(0, 12000)
    );
  }
  if (calibration && typeof calibration === 'object') {
    const toneMap = {
      formal: 'Formal, scholarly register. No slang. Precise claims.',
      technical: 'Technical, direct, engineer-to-engineer. Prefer concrete nouns over abstractions.',
      natural: 'Close, spoken, unforced. Contractions allowed. No corporate padding.'
    };
    const cadenceMap = {
      short: 'Prefer short, dense sentences. Cut filler. Occasional longer sentence for contrast.',
      mixed: 'High sentence-length variance. Alternate 4-7 word punches with 18-28 word compounds.',
      long: 'Allow elaborated multi-clause sentences, still broken by a short beat every few lines.'
    };
    const lexiconMap = {
      precise: 'Concrete, specific vocabulary. Avoid ornamental adjectives.',
      everyday: 'Plain, idiomatic wording a careful human would actually type.',
      literary: 'Richer diction without purple prose or AI ornament.'
    };
    const tone = toneMap[calibration.tone] || toneMap.natural;
    const cadence = cadenceMap[calibration.cadence] || cadenceMap.mixed;
    const lexicon = lexiconMap[calibration.lexicon] || lexiconMap.everyday;
    parts.push(
      'CALIBRATION PROFILE:\n- Tone: ' + tone + '\n- Cadence: ' + cadence + '\n- Lexicon: ' + lexicon
    );
  }
  return parts.length ? '\n\n' + parts.join('\n\n') + '\n' : '';
}

function buildSystemPromptEn(mode, styleGuide, calibration) {
  let modeInstructions = '';
  switch (mode) {
    case 'corrector':
      modeInstructions = '- ROLE: Master proofreader, editor, and stylistic polisher.\n' +
        '- Correct spelling, punctuation, grammar, agreements, and sentence flow.\n' +
        '- Eliminate awkward phrasing and redundancies while strictly preserving technical terminology and facts.\n' +
        '- PRESERVE 100% OF MARKDOWN FORMATTING, HEADINGS, BULLETS, TABLES, AND CODE.';
      break;
    case 'academic':
      modeInstructions = '- Preserve scholarly rigor, data, citations, technical terminology, and all arguments.\n' +
        '- Radically vary sentence structure: interweave brief punchy points with compound explanatory statements.\n' +
        '- Use organic academic vocabulary; eliminate formulaic transition markers.\n' +
        '- Balance active and passive voice naturally.';
      break;
    case 'casual':
      modeInstructions = '- Natural, conversational, fluid, and relatable tone.\n' +
        '- Natural phrasing, organic pauses, contractions, and human rhythm.\n' +
        '- Zero robotic stiffness or corporate jargon.';
      break;
    case 'executive':
      modeInstructions = '- Direct, concise, business-focused, high-impact prose.\n' +
        '- Eliminate corporate fluff, ornamental transitions, and verbose padding.\n' +
        '- Straight to the point with authoritative clarity.';
      break;
    default:
      modeInstructions = '- GOAL: clear, natural prose that keeps the author\'s meaning.\n' +
        '- RHYTHM: Vary sentence length. A 3-to-6 word punchy sentence. Then an intricate 22-to-28 word multi-clause sentence. Then a moderate 10-word sentence. Avoid a monotonous rhythm.\n' +
        '- VOCABULARY: Prefer plain, precise words over stock phrases.\n' +
        '- AVOID CLICHES: Never use: delve, tapestry, testament, beacon, crucial, paramount, realm, furthermore, moreover, in conclusion, underscores, pivotal, seamless, fostering, holistic, interplay, cornerstone.\n' +
        '- Preserve 100% of facts, names, figures, dates, links, citations, and semantic meaning.';
      break;
  }

  return 'You are "Rewrite AI Core", a careful text editor that rewrites drafts so they read clearly and naturally.\n' +
    'Improve wording and flow without changing the meaning.\n\n' +
    'CRITICAL REQUIREMENT 1: ONLY REWRITE THE WORDS (1:1 CORRESPONDENCE):\n' +
    '- DO NOT summarize, omit content, or invent new facts.\n' +
    '- Maintain a strict 1-to-1 correspondence with the source: every paragraph, bullet point, and thought in the original must exist in the rewritten output.\n' +
    '- Your task is strictly surgical rewording and cadence variation to improve readability.\n\n' +
    'CRITICAL REQUIREMENT 2: STRICT MARKDOWN & STRUCTURAL FIDELITY:\n' +
    '- DO NOT FLATTEN OR MERGE KEY-VALUE PAIRS, BULLETS, HEADINGS, OR SECTIONS INTO CONTINUOUS NARRATIVE PROSE.\n' +
    '- Retain every Markdown heading (#, ##, ###), bold (**), italic (*), list item (- or *), blockquote (>), table (| ... |), and horizontal rule (---).\n' +
    '- DO NOT TOUCH CODE BLOCKS (``` ... ```) OR INLINE CODE (`...`) — PRESERVE THEM 100% VERBATIM.\n' +
    '- Keep all URLs and link targets intact.\n' +
    '- If the text has field labels (e.g., "Project Name:", "Description:"), keep each label intact on its own line and only humanize the text following it.\n\n' +
    'CRITICAL REQUIREMENT 3: STRICT LANGUAGE PRESERVATION:\n' +
    '- The input text is in English. Your output MUST be 100% in English.\n' +
    '- NEVER translate to Spanish or any other language.\n\n' +
    'DIRECTIVES:\n' + modeInstructions + '\n\n' +
    'OUTPUT RULES:\n' +
    '- Return ONLY the transformed text.\n' +
    '- DO NOT include any introductory or concluding remarks (e.g., "Here is the humanized version:").\n' +
    '- Start your response immediately with the rewritten content.' +
    buildStyleBlock(styleGuide, calibration);
}

function buildSystemPromptEs(mode, styleGuide, calibration, stylePreset) {
  let presetRule = "";
  if (stylePreset === 'academic') presetRule = "\n- PRESET ACADÉMICO: Usa un tono formal, técnico y objetivo, ideal para papers o informes universitarios.";
  else if (stylePreset === 'simple') presetRule = "\n- PRESET SIMPLIFICAR: Reduce la complejidad léxica, usa vocabulario accesible (Modo Fácil) para todos los públicos.";
  else if (stylePreset === 'executive') presetRule = "\n- PRESET EJECUTIVO: Ve directo al grano, usa tono corporativo y prioriza la claridad y brevedad (Business).";
  else presetRule = "\n- PRESET NATURAL: Mantén un tono coloquial, divulgativo y conversacional fluido.";

  return `Eres un redactor humano nativo con estilo orgánico, directo y variado. Tu objetivo es reescribir el texto original para que suene 100% natural, asimétrico y vivo, manteniendo íntegro el significado y los datos técnicos.

REGLAS INQUEBRANTABLES:
- Prohibido utilizar estructuras oracionales homogéneas: alterna oraciones cortas y directas con explicaciones compuestas.
- Lista negra de muletillas de IA (PROHIBIDAS): 'fundamental', 'crucial', 'en resumen', 'en conclusión', 'un tapiz', 'a día de hoy', 'en el panorama actual', 'cabe destacar', 'no solo... sino también'.
- Evita conclusiones formulaicas que empiecen por 'En definitiva' o resuman lo ya dicho.
- Devuelve únicamente el texto final reescrito, sin saludos ni aclaraciones previas o posteriores.` + presetRule + buildStyleBlock(styleGuide, calibration);
}

async function callGroqWithLadder(prompt, systemPrompt, apiKey, requestedModel, temperature = 0.85, maxTokens = 3500) {
  const ladder = requestedModel 
    ? [requestedModel, ...GROQ_MODEL_LADDER.filter(m => m !== requestedModel)]
    : GROQ_MODEL_LADDER;

  let lastError = null;

  for (const modelToTry of ladder) {
    try {
      const payload = {
        model: modelToTry,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        top_p: 0.92,
        presence_penalty: 0.15,
        frequency_penalty: 0.20,
        ...groqReasoningOpts(modelToTry, maxTokens)
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.trim()) {
        return { text: text.trim(), model: modelToTry };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq models failed in fallback ladder.');
}

async function callGroqStream(prompt, systemPrompt, apiKey, requestedModel, originalText, temperature = 0.7, maxTokens = 3500, extraHeaders = {}) {
  const modelToUse = requestedModel || GROQ_MODEL_LADDER[0];
  const payload = {
    model: modelToUse,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature,
    top_p: 0.92,
    presence_penalty: 0.15,
    frequency_penalty: 0.20,
    stream: true,
    ...groqReasoningOpts(modelToUse, maxTokens)
  };

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!groqRes.ok) {
    const errJson = await groqRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Groq Stream HTTP ${groqRes.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullAccumulated = '';
  let buf = '';
  let finished = false;

  const finish = (controller) => {
    if (finished) return;
    finished = true;
    controller.enqueue(encoder.encode(`data: ${doneEvent(fullAccumulated, originalText, `Groq LPU (${modelToUse})`)}\n\n`));
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
  };

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();

        if (dataStr === '[DONE]') {
          finish(controller);
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullAccumulated += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: delta })}\n\n`));
          }
        } catch (e) {}
      }
    },
    flush(controller) {
      finish(controller);
    }
  });

  return new Response(groqRes.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      ...extraHeaders
    }
  });
}

function doneEvent(rawText, originalText, provider) {
  const cleaned = stripMarkdown(cleanModelOutput(rawText));
  const origM = calculateMetrics(originalText);
  const humM = calculateMetrics(cleaned);
  return JSON.stringify({
    done: true,
    provider,
    text: cleaned,
    metrics: {
      original: origM,
      humanized: humM,
      aiScoreEstimate: {
        originalAiProb: Math.min(99, Math.max(75, Math.round(100 - origM.burstiness * 1.1))),
        humanizedAiProb: Math.max(0, Math.min(1, Math.round(1 - (humM.burstiness / 60))))
      }
    }
  });
}

// Respuesta SSE de un solo bloque (cuando el stream de Groq falla y usamos la escalera síncrona)
function sseFromText(text, provider, extraHeaders = {}) {
  const body = `data: ${JSON.stringify({ chunk: text })}\n\ndata: ${JSON.stringify({ done: true, provider, text })}\n\ndata: [DONE]\n\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders }
  });
}

async function callOpenAI(prompt, systemPrompt, apiKey, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3500
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function fallbackHeuristicHumanizer(text, mode) {
  let processed = text;

  const replaceMap = {
    'furthermore': 'also',
    'moreover': 'besides',
    'crucial': 'vital',
    'paramount': 'key',
    'testament': 'clear proof',
    'tapestry': 'complex mix',
    'in conclusion': 'overall',
    'delve': 'dig into',
    'sumergirse': 'entrar de lleno',
    'tapiz': 'entramado',
    'testimonio': 'prueba evidente',
    'es fundamental destacar': 'conviene notar',
    'cabe señalar': 'a su vez',
    'desempeña un papel': 'actúa como factor'
  };

  for (const [aiWord, humanWord] of Object.entries(replaceMap)) {
    const reg = new RegExp(`\\b${aiWord}\\b`, 'gi');
    processed = processed.replace(reg, humanWord);
  }

  return processed;
}

function cleanModelOutput(text) {
  if (!text) return '';
  let cleaned = text.trim();
  
  // Strip AI preamble lines
  cleaned = cleaned.replace(/^(?:¡?claro!?|por supuesto|aquí\s+(?:te presento|tienes|está|adjunto)|here\s+(?:is|are)|sure|certainly)[^\n]*?:?\s*(\r?\n)+/i, '');
  cleaned = cleaned.replace(/^(?:aquí\s+(?:te presento|tienes|está)\s+el\s+texto[^\n]*?:?|versión humanizada:?|here is the (?:humanized|rewritten|proofread)[^\n]*?:?)\s*(\r?\n)*/i, '');
  
  if ((cleaned.startsWith('"""') && cleaned.endsWith('"""')) || (cleaned.startsWith("'''") && cleaned.endsWith("'''"))) {
    cleaned = cleaned.slice(3, -3).trim();
  }
  return cleaned.trim();
}

function calculateMetrics(text) {
  if (!text) {
    return { wordCount: 0, charCount: 0, burstiness: 0, clichéCount: 0 };
  }

  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  let sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  if (sentenceLengths.length === 0) sentenceLengths = [words.length];

  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / sentenceLengths.length;
  const stdDev = Math.sqrt(variance);

  const burstiness = Math.min(99, Math.max(10, Math.round((stdDev / (avgLength || 1)) * 45 + 50)));

  const textLower = text.toLowerCase();
  let clichéCount = 0;
  for (const w of [...BANNED_AI_WORDS_EN, ...BANNED_AI_WORDS_ES]) {
    const reg = new RegExp('\\b' + w + '\\b', 'gi');
    const matches = textLower.match(reg);
    if (matches) clichéCount += matches.length;
  }

  return {
    wordCount: words.length,
    charCount: text.length,
    burstiness,
    clichéCount
  };
}


/* ---------- Instrucciones de reescritura (sin objetivos de evasión de detectores) ---------- */
const STYLES_ES = {
  natural: 'Tono conversacional y humano, como una buena columna divulgativa o artículo de autor: directo, claro y fresco, eliminando rodeos para que el texto sea ágil y resumido sin perder sustancia.',
  academic: 'Registro académico formal pero sin relleno: riguroso, objetivo y bien argumentado, eliminando la verborrea vacía y los rodeos.',
  simple: 'Lenguaje sencillo y accesible: oraciones directas, vocabulario común y explicaciones llanas sin tecnicismos innecesarios. Fácil de entender a la primera.',
  executive: 'Resumen ejecutivo de alto impacto: síntesis en 2 o 3 párrafos muy breves de los puntos clave, datos esenciales y conclusiones prácticas (máximo 120 palabras).',
};
const STYLES_EN = {
  natural: 'Conversational and authentically human, like a sharp feature article: direct, clear, and unpretentious, cutting fluff so the text is punchy and concise without losing substance.',
  academic: 'Academic register without bloat: precise, objective, and well-structured, cutting hollow jargon and unnecessary padding.',
  simple: 'Plain, accessible language: short, clear sentences and everyday words. Direct and easy for anyone to read.',
  executive: 'High-impact executive summary: condense key takeaways into 2-3 short paragraphs focusing on conclusions and hard facts (at most 120 words).',
};

function buildPrompts(mode, preset, isEnglish, text, styleGuide, calibration) {
  const wc = text.replace(/[*#>_`-]+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const extra = typeof buildStyleBlock === 'function' ? buildStyleBlock(styleGuide, calibration) : '';
  if (isEnglish) {
    if (mode === 'corrector') return {
      systemPrompt: 'You are a meticulous copy editor. Fix spelling, grammar, punctuation and awkward phrasing. Keep the author\'s wording, order and structure (paragraphs, headings as their own lines, list items as their own lines). Remove Markdown symbols (**, __, #, *, -, ---, >) but keep the line structure; a list item becomes a line starting with a dash-free sentence. Keep facts, numbers and names exactly. Output only the corrected text, no preface.' + extra,
      userPrompt: 'Correct this text:\n\n' + text,
    };
    return {
      systemPrompt: 'You are an expert human writer and editor. Your mission is to rewrite drafts, notes, or AI-generated text into authentic, clear, engaging, and genuinely human prose.\n' +
        'Rewrite with authentic human flow, not superficial synonym swapping: restructure sentences, eliminate filler words and circumlocutions, and vary cadence naturally.\n' +
        'Output clean plain text in paragraphs. No Markdown at all: turn headings into natural introductory sentences, turn bullet lists into connected narrative prose, and drop bold/italics or horizontal rules.\n' +
        'Cut the fluff and synthesize: make the text somewhat more concise and punchy while keeping every fact, figure, percentage, name, and core insight completely accurate. Write in English. Do not invent new claims.\n' +
        'Avoid stock phrases and robotic markers: "in conclusion", "it is worth noting", "paradox", "crucial", "in today\'s world", "delve", "landscape", "tapestry", "moreover", "furthermore", "not only... but also", "plays a pivotal role", "seamless", "holistic".\n' +
        'Style: ' + (STYLES_EN[preset] || STYLES_EN.natural) + '\n' +
        'Return only the rewritten text, no title, no preface, no explanation.' + extra,
      userPrompt: 'Rewrite the text between <text> and </text> so it reads 100% human, natural, and more concise:\n' +
        '1. Synthesize and tighten: Cut fluff, repetitive statements, and padding. Make the text punchier and more condensed (around ' + Math.round(wc * 0.70) + '-' + Math.round(wc * 0.85) + ' words; the original has ' + wc + ') while keeping every fact, figure, name, and core insight intact.' + (preset === 'executive' ? ' (Executive Mode: condense into at most 120 words focusing on conclusions and hard facts).' : '') + '\n' +
        '2. Natural rhythm: Vary cadence organically so it sounds authentic and engaging when read aloud. Avoid formulaic sentence patterns.\n' +
        '3. Plain text: no **, #, *, bullets, numbering or ---; lists become smooth prose.\n' +
        '4. Avoid AI clichés: Do not use "delve", "tapestry", "crucial", "testament", "furthermore", "moreover", "in conclusion", "in today\'s world". Keep all figures and names.\n' +
        '5. ' + (STYLES_EN[preset] || STYLES_EN.natural) + '\n\n<text>\n' + text + '\n</text>',
    };
  }
  if (mode === 'corrector') return {
    systemPrompt: 'Eres un corrector de estilo meticuloso. Corrige ortografía, gramática, puntuación, concordancias y frases torpes. Respeta las palabras, el orden y la estructura del autor (párrafos, títulos en su propia línea, cada elemento de lista en su propia línea). Elimina los símbolos Markdown (**, __, #, *, -, ---, >) pero conserva los saltos de línea. Mantén datos, cifras y nombres exactos. Devuelve solo el texto corregido, sin introducciones.' + extra,
    userPrompt: 'Corrige este texto:\n\n' + text,
  };
  return {
    systemPrompt: 'Eres un editor y redactor humano de primer nivel. Tu objetivo es transformar borradores, notas o textos generados por IA en prosa auténtica, viva, fluida y agradable de leer, con voz humana real.\n' +
      'Reescribe a fondo con naturalidad, no te limites a cambiar sinónimos: reestructura las oraciones, poda la verborrea, las redundancias y los rodeos innecesarios, y usa conectores naturales y cotidianos (pero, sin embargo, por eso, así que, además, de hecho, al fin y al cabo).\n' +
      'Devuelve texto plano limpio en párrafos. Nada de Markdown: convierte cada título en una frase de apertura natural del párrafo, convierte las listas en prosa enlazada y elimina negritas, cursivas y separadores (**, ###, *, ---).\n' +
      'Sintetiza y ve al grano: haz que el texto quede un poco más resumido y ágil, pero conservando rigurosamente todos los datos, cifras, porcentajes, nombres y el mensaje central. Escribe en español. No inventes afirmaciones nuevas.\n' +
      'Evita muletillas y clichés de IA: "en resumen", "en conclusión", "cabe destacar", "es importante señalar", "paradoja", "crucial", "fundamental", "en un mundo", "en el panorama actual", "a día de hoy", "no solo... sino también", "un tapiz", "desempeña un papel", "un sinfín de", "adentrarse en". Evita conclusiones artificiales.\n' +
      'Estilo: ' + (STYLES_ES[preset] || STYLES_ES.natural) + '\n' +
      'Devuelve únicamente el texto reescrito, sin título, sin introducción y sin explicaciones.' + extra,
    userPrompt: 'Reescribe el texto entre <texto> y </texto> para que suene 100 % humano, natural y un poco más resumido:\n' +
      '1. Síntesis y concisión: Poda el relleno, las vueltas y las redundancias. Condensa el mensaje para que quede más directo y ágil (en torno a ' + Math.round(wc * 0.70) + '-' + Math.round(wc * 0.85) + ' palabras; el original tiene ' + wc + '), manteniendo todos los datos, cifras, nombres y argumentos centrales.' + (preset === 'executive' ? ' (Modo Resumen Ejecutivo: sintetiza en como máximo 120 palabras los puntos clave y conclusiones).' : '') + '\n' +
      '2. Ritmo humano: Varía la cadencia de forma natural y fluida, como quien habla o redacta con soltura, sin frases forzadas ni estructuras mecánicas.\n' +
      '3. Texto plano: sin **, #, *, viñetas, numeración ni ---. Las listas se cuentan como prosa enlazada.\n' +
      '4. Sin muletillas de IA: No uses "cabe destacar", "es fundamental", "crucial", "en resumen", "en conclusión", "en el panorama actual", "a día de hoy", "no solo... sino también", "un tapiz". Mantén todas las cifras y nombres.\n' +
      '5. ' + (STYLES_ES[preset] || STYLES_ES.natural) + '\n\n<texto>\n' + text + '\n</texto>',
  };
}

function stripMarkdown(t) {
  return String(t || '').replace(/<\/?(texto|text)>/gi, '')
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[*\-+•]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


const LANG_NAMES = { es: 'español', en: 'inglés (English)', ca: 'catalán (català)', fr: 'francés (français)', de: 'alemán (Deutsch)', it: 'italiano', pt: 'portugués (português)' };
function buildTranslatePrompts(text, target) {
  const name = LANG_NAMES[target] || LANG_NAMES.en;
  return {
    systemPrompt: 'Eres un traductor profesional. Detecta el idioma de origen y traduce al ' + name + ' de forma natural y fluida, como lo escribiría un nativo, sin calcos. Conserva el sentido, los datos, las cifras, las unidades y los nombres propios. Devuelve texto plano en párrafos: sin Markdown (**, #, *, ---); los títulos pasan a ser frases de apertura y las listas, frases. Devuelve solo la traducción, sin notas ni explicaciones.',
    userPrompt: 'Traduce al ' + name + ' el texto entre <texto> y </texto>:\n\n<texto>\n' + text + '\n</texto>'
  };
}

// Convierte el stream SSE de Workers AI ({"response":"..."}) en el formato de la app ({"chunk":"..."}).
// Con opts.retry: al terminar, si el texto tiene menos de opts.minWords palabras, envía {reset:true} y emite un segundo intento.
function workersAiToSse(aiStream, model, opts) {
  const enc = new TextEncoder();
  const send = (ctl, obj) => ctl.enqueue(enc.encode('data: ' + JSON.stringify(obj) + '\n\n'));
  async function pump(stream, ctl) {
    const reader = stream.getReader(), dec = new TextDecoder();
    let buf = '', acc = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const raw of lines) {
        const l = raw.trim();
        if (!l.startsWith('data:')) continue;
        const d = l.slice(5).trim();
        if (!d || d === '[DONE]') continue;
        try {
          const j = JSON.parse(d);
          const piece = typeof j.response === 'string' ? j.response : '';
          if (piece) { acc += piece; send(ctl, { chunk: piece }); }
        } catch (_) {}
      }
    }
    return acc;
  }
  return new ReadableStream({
    async start(ctl) {
      try {
        const first = await pump(aiStream, ctl);
        const words = first.trim().split(/\s+/).filter(Boolean).length;
        let attempts = 1;
        if (opts && opts.retry && words < opts.minWords) {
          send(ctl, { reset: true, reason: 'length', words });
          await pump(await opts.retry(words), ctl);
          attempts = 2;
        }
        send(ctl, { done: true, model, attempts });
      } catch (e) {
        send(ctl, { error: 'stream' });
      }
      ctl.close();
    }
  });
}
