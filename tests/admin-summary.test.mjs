import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/admin/summary.js';
let me = null;
globalThis.fetch = async (u, init) => {
  assert.equal(String(u), 'https://guides.trujillomingorance.com/api/auth/me');
  assert.ok(init.headers.Cookie.includes('ta_session='));
  return new Response(JSON.stringify(me || { authenticated: false, user: null }));
};
const env = { GROQ_API_KEY: 'secret-value', AI: {}, ENVIRONMENT: 'production' };
const req = (c, o = 'https://guides.trujillomingorance.com') => new Request('https://rewrite.trujillomingorance.com/api/admin/summary', { headers: { ...(c ? { Cookie: c } : {}), Origin: o } });
test('403 sin sesión, autor o interno de otro proveedor', async () => {
  assert.equal((await onRequest({ request: req(''), env })).status, 403);
  me = { authenticated: true, user: { role: 'author', provider: 'x' } };
  assert.equal((await onRequest({ request: req('ta_session=t'), env })).status, 403);
  me = { authenticated: true, user: { role: 'internal', provider: 'google' } };
  assert.equal((await onRequest({ request: req('ta_session=t'), env })).status, 403);
});
test('interno: estado sin valores de secretos y CORS solo para el panel', async () => {
  me = { authenticated: true, user: { role: 'internal', provider: 'microsoft' } };
  const r = await onRequest({ request: req('ta_session=t'), env });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://guides.trujillomingorance.com');
  const txt = await r.text();
  assert.ok(!txt.includes('secret-value'));
  assert.deepEqual(JSON.parse(txt).facts.find((f) => f[0] === 'groq'), ['groq', 'on']);
  const o = await onRequest({ request: req('ta_session=t', 'https://evil.example.com'), env });
  assert.equal(o.headers.get('Access-Control-Allow-Origin'), null);
});
