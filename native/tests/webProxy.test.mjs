import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createWebServer } from '../scripts/serve-web.mjs';

async function start(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('shelf and review DELETE reach Backend with bearer credentials and return empty 204', async t => {
  const received = [];
  const upstream = await start(t, createServer((req, res) => {
    received.push({ path: req.url, method: req.method, token: req.headers.authorization, cookie: req.headers.cookie });
    res.writeHead(204).end();
  }));
  const proxy = await start(t, createWebServer({ backendUrl: upstream }));
  for (const resource of ['shelf', 'reviews']) {
    const response = await fetch(`${proxy}/api/users/42/${resource}/3`, {
      method: 'DELETE', headers: { Authorization: 'Bearer synthetic-test-token', Cookie: 'not-forwarded=1' },
    });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.deepEqual(received, ['shelf', 'reviews'].map(resource => ({ path: `/api/users/42/${resource}/3`, method: 'DELETE', token: 'Bearer synthetic-test-token', cookie: undefined })));
});
test('rejected methods never reach Backend and ownership errors are preserved', async t => {
  let calls = 0;
  const upstream = await start(t, createServer((req, res) => {
    calls++;
    res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: 'FORBIDDEN', message: '권한 없음' }));
  }));
  const proxy = await start(t, createWebServer({ backendUrl: upstream }));
  assert.equal((await fetch(`${proxy}/api/users/42/shelf`, { method: 'PATCH' })).status, 405);
  assert.equal(calls, 0);
  const response = await fetch(`${proxy}/api/users/42/shelf/3`, { method: 'DELETE' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'FORBIDDEN');
  assert.equal(calls, 1);
});
