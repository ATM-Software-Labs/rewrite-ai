// Protección barata para los endpoints que llaman a la IA (/api/rewrite, /api/humanize, /api/tools).
// Sin KV ni D1: no añade lecturas ni escrituras facturables.
//  · Origen: solo navegadores en rewrite.trujillomingorance.com, *.trujillomingorance.com o las vistas previas de Pages.
//  · Tamaño: el texto se limita a MAX_CHARS (evita peticiones gigantes que gastan neuronas).
//  · Ritmo: tope por IP y por instancia (ventana deslizante en memoria). No es un límite global,
//    pero corta los bucles y los scripts que repiten la misma petición.

export const MAX_CHARS = 12000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 30;
const hits = new Map();

export function allowedOrigin(origin) {
  if (!origin) return '';
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return '';
    const h = u.hostname;
    if (h === 'trujillomingorance.com' || h.endsWith('.trujillomingorance.com')) return u.origin;
    if (h === 'rewrite-ai-azu.pages.dev' || h.endsWith('.rewrite-ai-azu.pages.dev')) return u.origin;
  } catch (_) {}
  return '';
}

export function corsFor(request, extra = {}) {
  const o = allowedOrigin(request.headers.get('Origin'));
  return { ...(o ? { 'Access-Control-Allow-Origin': o } : {}), Vary: 'Origin', ...extra };
}

export function rateLimited(request, now = Date.now()) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_HITS) { hits.set(ip, list); return Math.ceil((WINDOW_MS - (now - list[0])) / 1000); }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return 0;
}

// Devuelve una Response de rechazo o null si la petición puede seguir.
export function guard(request, headers) {
  if (!allowedOrigin(request.headers.get('Origin'))) {
    return new Response(JSON.stringify({ error: 'Origen no permitido.' }), { status: 403, headers });
  }
  const wait = rateLimited(request);
  if (wait) {
    return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Prueba de nuevo en unos minutos.' }), { status: 429, headers: { ...headers, 'Retry-After': String(wait) } });
  }
  return null;
}

export function tooLong(text) {
  return typeof text === 'string' && text.length > MAX_CHARS;
}

export function _resetForTests() { hits.clear(); }
