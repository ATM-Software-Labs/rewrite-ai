/**
 * Cloudflare Pages Function: /api/tools
 * Motores especializados de auditoría y optimización de texto
 * (Auditoría Anti-detección, Tono & Emoción, Hooks Virales, Coherencia Profunda, Traducción Contextual)
 */

const TOOL_DEFINITIONS = {
  audit: {
    name: 'Auditoría & Detector Sintético Multi-Score',
    systemPrompt: `Actúa como un motor de auditoría de textos, detector sintético (estilo GPTZero/Copyleaks) y optimizador multiformato de nivel empresarial. Analiza el texto de entrada bajo criterios estadísticos (perplejidad, varianza/burstiness), evalúa su calidad y devuelve estrictamente un objeto JSON válido (sin bloques de código markdown adicionales, solo el JSON plano) con la siguiente estructura exacta:

{
  "scores": {
    "global_quality": <número entero 0-100>,
    "ai_probability": <número entero 0-100 que indique la probabilidad estimada de ser detectado como IA>,
    "perplexity": <número entero 0-100 que mida la complejidad y variedad léxica>,
    "burstiness": <número entero 0-100 que mida la naturalidad en la alternancia de longitud de frases>,
    "grammar": <número entero 0-100>
  },
  "diagnostico_detectores": {
    "gptzero_simulacion": "Diagnóstico breve de cómo catalogaría este texto GPTZero basándose en su uniformidad y patrones sintácticos.",
    "copyleaks_simulacion": "Evaluación estimada de predictibilidad de tokens y repetición léxica."
  },
  "analisis_critico": "Breve análisis de 2 o 3 frases sobre los puntos débiles del texto original (muletillas, tono plano, etc.).",
  "versiones": {
    "humanizada_antidetector": "Versión reescrita rompiendo patrones robóticos, introduciendo pausas orgánicas y variando drásticamente la estructura de las oraciones sin alterar ni un solo dato, cifra o sentido original.",
    "seo_optimizada": "Versión adaptada para buscadores, mejorando la retención de lectura y la naturalidad de términos clave.",
    "resumen_ejecutivo": "Versión en viñetas (bullet points) directa al grano con los puntos clave del texto."
  }
}`,
    buildUserPrompt: (text) => `Texto de entrada a procesar:\n"""\n${text}\n"""`
  },

  sentiment: {
    name: 'Detector de Tono y Emoción',
    systemPrompt: `Actúa como un analista de marketing y sociolingüística. Analiza el texto proporcionado e identifica el tono predominante, la intención comunicativa y la emoción que transmite al lector.

Devuelve estrictamente un objeto JSON válido (sin bloques de código markdown adicionales) con la siguiente estructura:

{
  "tono_principal": "Ej: Formal, Persuasivo, Académico, Casual, etc.",
  "intencion": "Ej: Informar, Vender, Argumentar, Educar",
  "emocion_detectada": "Ej: Neutro, Entusiasta, Urgente, Empático",
  "nivel_formalidad": <número entero de 0 a 100 donde 0 es informal y 100 es ultraformal>,
  "sugerencia_ajuste": "Breve recomendación sobre si el tono actual es adecuado para su objetivo o si debería modificarse."
}`,
    buildUserPrompt: (text) => `Texto de entrada:\n"""\n${text}\n"""`
  },

  hooks: {
    name: 'Generador de Titulares / Hooks Virales',
    systemPrompt: `Actúa como un experto en copywriting viral y estrategias de conversión en redes sociales (X, LinkedIn) y blogs. A partir del texto proporcionado, genera alternativas de ganchos (headlines o titulares) altamente atractivos que capten la atención en los primeros 3 segundos.

Devuelve estrictamente un objeto JSON válido con la siguiente estructura:

{
  "titulares_gancho": [
    "Titular 1 enfocado en curiosidad o misterio",
    "Titular 2 enfocado en beneficio directo o dolor del lector",
    "Titular 3 enfocado en dato impactante o contracorriente"
  ]
}`,
    buildUserPrompt: (text) => `Texto de entrada:\n"""\n${text}\n"""`
  },

  proofread: {
    name: 'Corrector de Estilo y Coherencia Profunda',
    systemPrompt: `Actúa como un corrector de estilo literario y redactor jefe. Analiza el siguiente texto en busca de errores de coherencia, ambigüedades, redundancias conceptuales y problemas de cohesión entre párrafos.

Devuelve estrictamente un objeto JSON válido con la siguiente estructura:

{
  "errores_detectados": [
    {
      "tipo": "Ej: Redundancia / Ambigüedad / Salto de lógica",
      "descripcion": "Explicación breve del fallo encontrado en el texto original."
    }
  ],
  "texto_corregido_estilo": "Versión corregida aplicando rigor ortotipográfico, fluidez gramatical y máxima cohesión textual, sin alterar los datos ni la longitud sustancial del mensaje."
}`,
    buildUserPrompt: (text) => `Texto de entrada:\n"""\n${text}\n"""`
  },

  translate: {
    name: 'Traductor Contextual Nativo con Adaptación Cultural',
    systemPrompt: (opts = {}) => `Actúa como un traductor profesional nativo y especialista en localización de contenidos. Traduce el siguiente texto al idioma de destino solicitado manteniendo el registro, el matiz emocional y adaptando las expresiones idiomáticas de forma natural.

Idioma de destino: ${opts.targetLanguage || 'inglés'}

Devuelve estrictamente un objeto JSON válido con la siguiente estructura:

{
  "traduccion_localizada": "Texto traducido con modismos y expresiones naturales del idioma de destino.",
  "notas_traductor": "Breve nota sobre adaptación de términos complejos o culturales si los hubiera."
}`,
    buildUserPrompt: (text) => `Texto de entrada:\n"""\n${text}\n"""`
  }
};

function safeExtractJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Respuesta del modelo vacía');
  }

  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-groq-user-key',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: 'Cuerpo de petición inválido (JSON esperado).' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { action, text, targetLanguage = 'inglés', model } = body;

    if (!action || !TOOL_DEFINITIONS[action]) {
      return new Response(JSON.stringify({
        error: `Acción no soportada: '${action}'. Opciones válidas: ${Object.keys(TOOL_DEFINITIONS).join(', ')}`
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'El texto debe contener al menos 5 caracteres.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const tool = TOOL_DEFINITIONS[action];
    const systemPrompt = typeof tool.systemPrompt === 'function'
      ? tool.systemPrompt({ targetLanguage })
      : tool.systemPrompt;
    const userPrompt = tool.buildUserPrompt(text);

    const groqKey = request.headers.get('x-groq-user-key') || env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'Falta la clave API de Groq.' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const modelsToTry = [
      model,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ].filter(Boolean);

    let lastError = null;
    let resultJson = null;
    let usedModel = '';

    for (const modelCandidate of modelsToTry) {
      try {
        const payload = {
          model: modelCandidate,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: action === 'hooks' ? 0.7 : 0.2,
          response_format: { type: 'json_object' },
          max_tokens: 3000
        };

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text().catch(() => '');
          lastError = new Error(`Groq HTTP ${groqRes.status}: ${errText}`);
          continue;
        }

        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content || '';
        resultJson = safeExtractJson(content);
        usedModel = modelCandidate;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!resultJson) {
      throw lastError || new Error('No se pudo procesar la solicitud con los modelos disponibles.');
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      model: usedModel,
      data: resultJson
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: `Error ejecutando la herramienta: ${error.message}`
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-groq-user-key'
    }
  });
}
