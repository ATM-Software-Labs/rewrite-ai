// GET /api/admin/summary — estado de Rewrite para el panel interno central.
// La sesión la verifica guides (/api/auth/me) con la cookie del usuario; se exige role internal + microsoft.
const GUIDES_ME = 'https://guides.trujillomingorance.com/api/auth/me';
const PANEL = 'https://guides.trujillomingorance.com';

function cors(request) {
  const o = request.headers.get('Origin') || '';
  return o === PANEL ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin, Cookie' } : { Vary: 'Origin, Cookie' };
}
function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', ...cors(request) } });
}

export async function internalUser(request, fetchImpl = fetch) {
  const cookie = request.headers.get('Cookie') || '';
  if (!/(?:^|;\s*)(?:ta_session|atm_session|session_token)=/.test(cookie)) return null;
  try {
    const r = await fetchImpl(GUIDES_ME, { headers: { Cookie: cookie, Accept: 'application/json' }, redirect: 'manual' });
    if (!r.ok) return null;
    const d = await r.json();
    const u = d && d.authenticated && d.user;
    return u && u.role === 'internal' && u.provider === 'microsoft' ? u : null;
  } catch (_) { return null; }
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(request), 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  if (request.method !== 'GET') return json(request, { error: 'method_not_allowed' }, 405);
  if (!(await internalUser(request))) return json(request, { error: 'forbidden' }, 403);
  // Solo si existe cada secreto (nunca su valor)
  return json(request, {
    ok: true,
    facts: [
      ['model', env.GROQ_API_KEY ? 'openai/gpt-oss-120b (Groq)' : (env.DEFAULT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast')],
      ['fallback', env.DEFAULT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
      ['workers-ai', env.AI ? 'on' : 'off'],
      ['groq', env.GROQ_API_KEY ? 'on' : 'off'],
      ['env', env.ENVIRONMENT || ''],
    ],
  });
}
