import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, rateLimited, guard, tooLong, MAX_CHARS, _resetForTests } from '../functions/lib/guard.js';
import { onRequest as auth } from '../functions/api/auth/[[action]].js';

const req = (origin, ip = '1.2.3.4') => new Request('https://rewrite.trujillomingorance.com/api/rewrite', { method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip } });

test('origen: solo trujillomingorance.com y vistas previas de Pages', () => {
  assert.equal(allowedOrigin('https://rewrite.trujillomingorance.com'), 'https://rewrite.trujillomingorance.com');
  assert.equal(allowedOrigin('https://abc.rewrite-ai-azu.pages.dev'), 'https://abc.rewrite-ai-azu.pages.dev');
  assert.equal(allowedOrigin('https://evil.example'), '');
  assert.equal(allowedOrigin('http://rewrite.trujillomingorance.com'), '');
  assert.equal(allowedOrigin('https://trujillomingorance.com.evil.example'), '');
  assert.equal(allowedOrigin(null), '');
});

test('guard: 403 sin origen válido, 429 al pasar el tope', () => {
  _resetForTests();
  assert.equal(guard(req(null), {}).status, 403);
  assert.equal(guard(req('https://evil.example'), {}).status, 403);
  for (let i = 0; i < 30; i++) assert.equal(guard(req('https://rewrite.trujillomingorance.com', '9.9.9.9'), {}), null);
  const r = guard(req('https://rewrite.trujillomingorance.com', '9.9.9.9'), {});
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get('Retry-After')) > 0);
  assert.equal(guard(req('https://rewrite.trujillomingorance.com', '8.8.8.8'), {}), null);
});

test('ventana deslizante: libera tras 10 minutos', () => {
  _resetForTests();
  const r = req('https://rewrite.trujillomingorance.com', '7.7.7.7');
  for (let i = 0; i < 30; i++) rateLimited(r, 1000);
  assert.ok(rateLimited(r, 2000) > 0);
  assert.equal(rateLimited(r, 1000 + 10 * 60 * 1000 + 1), 0);
});

test('tamaño máximo del texto', () => {
  assert.equal(tooLong('a'.repeat(MAX_CHARS)), false);
  assert.equal(tooLong('a'.repeat(MAX_CHARS + 1)), true);
});

test('/api/auth/me sin cookie responde sin subpetición', async () => {
  const orig = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response('{}'); };
  try {
    const r = await auth({ request: new Request('https://rewrite.trujillomingorance.com/api/auth/me'), params: { action: ['me'] } });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { authenticated: false, user: null });
    assert.equal(called, false);
    await auth({ request: new Request('https://rewrite.trujillomingorance.com/api/auth/me', { headers: { Cookie: 'ta_session=x' } }), params: { action: ['me'] } });
    assert.equal(called, true);
  } finally { globalThis.fetch = orig; }
});
