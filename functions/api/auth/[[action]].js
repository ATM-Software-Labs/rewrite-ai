/**
 * Rewrite · sesión compartida con *.trujillomingorance.com
 *
 * Rewrite no firma ni verifica tokens: la cookie de sesión (ta_session/atm_session/session_token,
 * Domain=.trujillomingorance.com) la emite guides.trujillomingorance.com (X) o ai.trujillomingorance.com
 * (Google) y la verificación se delega a guides con la cookie del usuario. Así no hace falta JWT_SECRET aquí.
 */
const GUIDES = 'https://guides.trujillomingorance.com';
const AI = 'https://ai.trujillomingorance.com';
const NO_STORE = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };

function safeReturn(raw, origin) {
  try {
    const u = new URL(raw || '/', origin);
    if (u.protocol === 'https:' && (u.hostname === 'trujillomingorance.com' || u.hostname.endsWith('.trujillomingorance.com'))) return u.toString();
  } catch (_) {}
  return origin + '/';
}

export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const action = (Array.isArray(params.action) ? params.action.join('/') : params.action || '').replace(/\/+$/, '');
  const back = safeReturn(url.searchParams.get('returnTo'), url.origin);

  // Iniciar sesión: redirigir a los flujos que ya tienen el callback registrado
  if (action === 'x' && request.method === 'GET') {
    return Response.redirect(`${GUIDES}/api/auth/x?returnTo=${encodeURIComponent(back)}`, 302);
  }
  if (action === 'microsoft' && request.method === 'GET') {
    return Response.redirect(`${GUIDES}/api/auth/microsoft?returnTo=${encodeURIComponent(back)}`, 302);
  }
  if (action === 'providers') {
    try {
      const up = await fetch(`${GUIDES}/api/auth/providers`, { headers: { Accept: 'application/json' } });
      const d = await up.json();
      return new Response(JSON.stringify({ microsoft: !!d.microsoft }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
    } catch (_) {
      return new Response(JSON.stringify({ microsoft: false }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
  }
  if (action === 'google' && request.method === 'GET') {
    return Response.redirect(`${AI}/login?redirect_to=${encodeURIComponent(back)}`, 302);
  }

  if (action === 'me' || action === 'logout') {
    const headers = new Headers({ 'Accept': 'application/json' });
    const cookie = request.headers.get('Cookie');
    const auth = request.headers.get('Authorization');
    if (cookie) headers.set('Cookie', cookie);
    if (auth) headers.set('Authorization', auth);
    try {
      const up = await fetch(`${GUIDES}/api/auth/${action}`, { method: action === 'logout' ? 'POST' : 'GET', headers, redirect: 'manual' });
      const out = new Headers({ 'Content-Type': up.headers.get('Content-Type') || 'application/json', ...NO_STORE });
      // Al cerrar sesión, reenviar las cookies que borra guides (Domain=.trujillomingorance.com) y las locales
      if (action === 'logout') {
        const list = typeof up.headers.getSetCookie === 'function' ? up.headers.getSetCookie() : [];
        for (const c of list) if (/Domain=\.trujillomingorance\.com/i.test(c)) out.append('Set-Cookie', c);
        for (const n of ['ta_session', 'atm_session', 'session_token']) out.append('Set-Cookie', `${n}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
      }
      // Sin sesión: 200 con authenticated:false (no es un error y así la consola queda limpia)
      const status = action === 'me' && up.status === 401 ? 200 : up.status;
      return new Response(await up.arrayBuffer(), { status, headers: out });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'No se pudo comprobar la sesión' }), { status: 502, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
    }
  }

  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
}
