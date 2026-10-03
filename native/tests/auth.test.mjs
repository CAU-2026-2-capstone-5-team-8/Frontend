import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore, validSession, accountStorageKey } from '../src/lib/authSession.ts';
import { createHttpClient, ApiError, SessionChangedError } from '../src/lib/httpClient.ts';
const session = id => ({ userId: id, accessToken: String(id).repeat(43), expiresAt: new Date(Date.now() + 60000).toISOString() });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('private requests require a login, attach its token, and handle logout 204', async () => {
  const sessions = createSessionStore(); const calls = [];
  const request = createHttpClient('/api', sessions, async (url, init) => { calls.push({ url, init }); return new Response(null, { status: 204 }); });
  await assert.rejects(request('/me'), e => e instanceof ApiError && e.status === 401);
  assert.equal(calls.length, 0);
  sessions.replace(session(1));
  assert.equal(await request('/auth/logout', 'POST'), undefined);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${session(1).accessToken}`);
});

test('public login errors do not clear a session; 403 is not an empty profile or logout', async () => {
  const sessions = createSessionStore(); sessions.replace(session(1));
  let status = 401;
  const request = createHttpClient('/api', sessions, async () => json({ message: 'denied' }, status));
  await assert.rejects(request('/auth/login', 'POST', {}, {}, false), e => e.status === 401);
  assert.equal(sessions.getSnapshot().session.userId, 1);
  status = 403;
  await assert.rejects(request('/me'), e => e.status === 403);
  assert.equal(sessions.getSnapshot().session.userId, 1);
  status = 401;
  await assert.rejects(request('/me'), e => e.status === 401);
  assert.equal(sessions.getSnapshot().session, null);
});

for (const status of [200, 401]) test(`late ${status} from account A cannot update or log out account B`, async () => {
  const sessions = createSessionStore(); sessions.replace(session(1));
  const pending = deferred(); const request = createHttpClient('/api', sessions, () => pending.promise);
  const response = request('/learning-recommendations/1');
  sessions.replace(null); sessions.replace(session(2));
  pending.resolve(json({ userId: 1 }, status));
  await assert.rejects(response, SessionChangedError);
  assert.equal(sessions.getSnapshot().session.userId, 2);
});

test('account change while decoding JSON also discards old data', async () => {
  const sessions = createSessionStore(); sessions.replace(session(1));
  const pending = deferred();
  const request = createHttpClient('/api', sessions, async () => ({ ok: true, status: 200, json: () => pending.promise }));
  const response = request('/me');
  await Promise.resolve(); sessions.replace(session(2)); pending.resolve({ userId: 1 });
  await assert.rejects(response, SessionChangedError);
});

test('expired credentials are cleared without sending a request', async () => {
  const sessions = createSessionStore(); sessions.replace({ ...session(1), expiresAt: '2000-01-01T00:00:00Z' });
  const request = createHttpClient('/api', sessions, () => { throw new Error('must not fetch'); });
  await assert.rejects(request('/me'), e => e.status === 401);
  assert.equal(sessions.getSnapshot().session, null);
  assert.equal(validSession({ ...session(1), expiresAt: 'invalid' }), false);
  assert.equal(validSession(session(1)), true);
});

test('session, recommendation and retry keys are partitioned by account and API', () => {
  for (const kind of ['session', 'learningRecommendation', 'learningRequest:1:application']) {
    assert.notEqual(accountStorageKey('/api', 1, 2, kind), accountStorageKey('/api', 2, 2, kind));
    assert.notEqual(accountStorageKey('/api', 1, 2, kind), accountStorageKey('https://other/api', 1, 2, kind));
    assert.notEqual(accountStorageKey('/api', null, 2, kind), accountStorageKey('/api', 1, 2, kind));
  }
});
