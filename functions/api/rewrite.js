/**
 * Cloudflare Pages Function: /api/rewrite
 * Proxy de streaming para la reescritura de textos
 * Groq LPU fallback ladder + Cloudflare Workers AI
 * Style.md calibration + sentence-level burstiness
 */

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
const GROQ_MODEL_LADDER = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'qwen-2.5-32b',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'mixtral-8x7b-32768'
];

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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

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
      calibration = null
    } = body;

    if (!text || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'El texto debe contener al menos 5 caracteres.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const detectedLang = language === 'auto' ? detectTextLanguage(text) : language;
    const isEnglish = detectedLang === 'en';

    const { systemPrompt, userPrompt } = buildPrompts(mode, stylePreset, isEnglish, text, styleGuide, calibration);

    const effectiveGroqKey = apiKey || env.GROQ_API_KEY || '';

    // --- STREAMING MODE (SSE) ---
    if (stream) {
      if (provider === 'groq' && effectiveGroqKey) {
        try {
          const streamResponse = await callGroqStream(userPrompt, systemPrompt, effectiveGroqKey, model, text);
          return streamResponse;
        } catch (streamErr) {
          // Fallback to non-streaming if stream fails
          console.error('Groq stream failed, falling back to synchronous:', streamErr);
        }
      }
    }

    // --- SYNCHRONOUS MODE ---
    let humanizedText = '';
    let usedProvider = provider;

    if (provider === 'groq' && effectiveGroqKey) {
      const groqRes = await callGroqWithLadder(userPrompt, systemPrompt, effectiveGroqKey, model);
      humanizedText = groqRes.text;
      usedProvider = `Groq LPU (${groqRes.model})`;
    } else if (provider === 'openai' && apiKey) {
      humanizedText = await callOpenAI(userPrompt, systemPrompt, apiKey, model || 'gpt-4o-mini');
      usedProvider = 'OpenAI';
    } else if (env.AI) {
      const modelName = model || env.DEFAULT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
      let aiResponse;
      try {
        aiResponse = await env.AI.run(modelName, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: mode === 'corrector' ? 0.3 : 0.85,
          top_p: 0.95,
          max_tokens: 3500
        });
      } catch (aiErr) {
        aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: mode === 'corrector' ? 0.3 : 0.85,
          max_tokens: 3500
        });
      }
      humanizedText = aiResponse.response || aiResponse.text || '';
      usedProvider = `Cloudflare Workers AI (${modelName})`;
    } else if (effectiveGroqKey) {
      const groqRes = await callGroqWithLadder(userPrompt, systemPrompt, effectiveGroqKey, model);
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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
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

async function callGroqWithLadder(prompt, systemPrompt, apiKey, requestedModel) {
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
        temperature: 0.85,
        top_p: 0.94,
        presence_penalty: 0.45,
        frequency_penalty: 0.35,
        max_tokens: 3500
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

async function callGroqStream(prompt, systemPrompt, apiKey, requestedModel, originalText) {
  const modelToUse = requestedModel || 'llama-3.3-70b-versatile';
  const payload = {
    model: modelToUse,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.85,
    top_p: 0.94,
    presence_penalty: 0.45,
    frequency_penalty: 0.35,
    max_tokens: 3500,
    stream: true
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

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const chunkStr = decoder.decode(chunk, { stream: true });
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();

        if (dataStr === '[DONE]') {
          const cleaned = stripMarkdown(cleanModelOutput(fullAccumulated));
          const origM = calculateMetrics(originalText);
          const humM = calculateMetrics(cleaned);
          const donePayload = JSON.stringify({
            done: true,
            provider: `Groq LPU (${modelToUse})`,
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
          controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          return;
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
    }
  });

  return new Response(groqRes.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
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
      temperature: 0.85,
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
  natural: 'Tono conversacional pero profesional, como una buena columna de prensa: cercano y claro, con alguna frase muy corta (de 4 a 8 palabras) que remate una idea y alguna pregunta o giro coloquial ocasional.',
  academic: 'Registro académico: preciso, impersonal cuando convenga, con conectores formales (no obstante, por tanto, en la medida en que) y frases más elaboradas, sin jerga vacía.',
  simple: 'Lenguaje sencillo: frases cortas (menos de 15 palabras), palabras cotidianas y explica entre paréntesis o con un ejemplo cualquier término técnico (refino, tierras raras…). Que lo entienda alguien de 14 años.',
  executive: 'Resumen ejecutivo: como máximo 120 palabras en 2 o 3 párrafos breves. Primera frase: la conclusión. Después, solo los datos clave. Última frase: qué implica en la práctica.',
};
const STYLES_EN = {
  natural: 'Conversational but professional, like a good feature article written by a person: warm, clear, with the occasional short sentence that lands a point.',
  academic: 'Academic register: precise, formal connectors (however, therefore, insofar as), more elaborate sentences, no empty jargon.',
  simple: 'Plain language: short sentences, everyday words, explain any technical term briefly. A 14-year-old should understand it.',
  executive: 'Executive summary: condense to the essentials in 2-4 short paragraphs. Lead with the conclusion, then key data, then the practical implication. You may halve the length.',
};

function buildPrompts(mode, preset, isEnglish, text, styleGuide, calibration) {
  const extra = typeof buildStyleBlock === 'function' ? buildStyleBlock(styleGuide, calibration) : '';
  if (isEnglish) {
    if (mode === 'corrector') return {
      systemPrompt: 'You are a meticulous copy editor. Fix spelling, grammar, punctuation and awkward phrasing. Keep the author\'s wording, order and structure (paragraphs, headings as their own lines, list items as their own lines). Remove Markdown symbols (**, __, #, *, -, ---, >) but keep the line structure; a list item becomes a line starting with a dash-free sentence. Keep facts, numbers and names exactly. Output only the corrected text, no preface.' + extra,
      userPrompt: 'Correct this text:\n\n' + text,
    };
    return {
      systemPrompt: 'You are an experienced human editor who rewrites drafts into natural, flowing prose.\n' +
        'Rewrite substantially, do not just swap synonyms: restructure sentences, merge short ones and split long ones, vary sentence length and rhythm, reorder ideas within a paragraph when it reads better, and use natural connectors.\n' +
        'Output clean plain text in paragraphs. No Markdown at all: turn headings into a natural opening sentence of the paragraph, turn bullet lists into connected prose, drop bold/italics and horizontal rules.\n' +
        'Keep every fact, figure, percentage, name and the overall meaning. Write in English. Do not add new claims.\n' +
        'Avoid stock phrases: "in conclusion", "it is worth noting", "paradox", "crucial", "in today\'s world", "delve", "landscape", "tapestry", "moreover", "furthermore", "not only... but also". Avoid parallel triplets and list-like cadence.\n' +
        'Style: ' + (STYLES_EN[preset] || STYLES_EN.natural) + '\n' +
        'Return only the rewritten text, no title, no preface, no explanation.' + extra,
      userPrompt: 'Thoroughly rewrite the text between <text> and </text>. Mandatory rules:\n1. Do not copy sentences: give every sentence a new structure; the first sentence must start differently from the original.\n2. Paragraphs of 2-4 sentences separated by a blank line.\n3. Plain text: no **, #, *, bullets, numbering or ---; lists become prose.\n4. Keep all figures and names. Avoid: paradox, crucial, delve, in conclusion, in today\'s world.\n5. ' + (STYLES_EN[preset] || STYLES_EN.natural) + '\n\n<text>\n' + text + '\n</text>',
    };
  }
  if (mode === 'corrector') return {
    systemPrompt: 'Eres un corrector de estilo meticuloso. Corrige ortografía, gramática, puntuación, concordancias y frases torpes. Respeta las palabras, el orden y la estructura del autor (párrafos, títulos en su propia línea, cada elemento de lista en su propia línea). Elimina los símbolos Markdown (**, __, #, *, -, ---, >) pero conserva los saltos de línea. Mantén datos, cifras y nombres exactos. Devuelve solo el texto corregido, sin introducciones.' + extra,
    userPrompt: 'Corrige este texto:\n\n' + text,
  };
  return {
    systemPrompt: 'Eres un editor con oficio que reescribe borradores para convertirlos en prosa natural y fluida, como la escribiría una persona.\n' +
      'Reescribe a fondo, no te limites a cambiar sinónimos: reestructura las frases, une las cortas y divide las largas, alterna frases breves y largas, reordena ideas dentro del párrafo si se lee mejor y usa conectores naturales (y es que, eso sí, al final, por eso, mientras tanto, de hecho).\n' +
      'Devuelve texto plano limpio en párrafos. Nada de Markdown: convierte cada título en una frase de apertura natural del párrafo, convierte las listas en prosa enlazada y elimina negritas, cursivas y separadores (**, ###, *, ---).\n' +
      'Conserva todos los datos, cifras, porcentajes, nombres y el sentido del original. Escribe en español. No añadas afirmaciones nuevas.\n' +
      'Evita muletillas y clichés: "en resumen", "en conclusión", "cabe destacar", "es importante señalar", "paradoja", "crucial", "fundamental", "en un mundo", "en el panorama actual", "a día de hoy", "no solo... sino también", "un tapiz". Evita enumeraciones de tres en tres y el ritmo de lista.\n' +
      'Estilo: ' + (STYLES_ES[preset] || STYLES_ES.natural) + '\n' +
      'Devuelve únicamente el texto reescrito, sin título, sin introducción y sin explicaciones.' + extra,
    userPrompt: 'Reescribe a fondo el texto entre <texto> y </texto>. Reglas obligatorias:\n' +
      '1. No copies frases del original: cada frase debe tener otra estructura (cambia el orden, el sujeto o el verbo). La primera frase tiene que empezar distinto que el original.\n' +
      '2. Divide el resultado en párrafos de 2 a 4 frases separados por una línea en blanco.\n' +
      '3. Texto plano: sin **, #, *, viñetas, numeración ni ---. Las listas se cuentan como prosa.\n' +
      '4. Mantén todas las cifras y nombres. No uses: paradoja, crucial, fundamental, cabe destacar, en resumen, en conclusión, en un mundo.\n' +
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
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
