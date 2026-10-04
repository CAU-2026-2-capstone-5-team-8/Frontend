import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningApi, requestKind, currentRecommendation, observationLabel, safeSourceUrl, nextChecks, supportsLearningProfile, conceptRole } from '../src/lib/learningRecommendations.ts';
import { createHttpClient } from '../src/lib/httpClient.ts';
import { createSessionStore } from '../src/lib/authSession.ts';

test('only observed v2 concept profiles can request a new recommendation', () => {
  for (const profile of [null, { evidence: {} }, { evidence: { conceptProfile: { version: 'concept-abilities-v1', abilities: [] } } }])
    assert.equal(supportsLearningProfile(profile), false);
  assert.equal(supportsLearningProfile({ evidence: { conceptProfile: { version: 'concept-abilities-v2', abilities: [] } } }), true);
});

test('prerequisite role distinguishes book coverage without implying teaching sufficiency', () => {
  assert.equal(conceptRole({isPrerequisite:true,isCovered:true}), '책 안의 선수개념');
  assert.equal(conceptRole({isPrerequisite:true,isCovered:false}), '책 밖의 선수개념 후보');
  assert.equal(conceptRole({isPrerequisite:false,isCovered:true}), '책에서 다루는 개념');
});

test('new recommendations request v2 with authenticated identity and preserve replay GET', async () => {
  const sessions = createSessionStore();
  sessions.replace({ userId: 7, accessToken: 'a'.repeat(43), expiresAt: '2099-01-01T00:00:00Z' });
  const calls = [];
  const request = createHttpClient('/api', sessions, async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: 42, modelVersion: 'concept-learning-v2' }), { headers: { 'Content-Type': 'application/json' } });
  });
  const api = createLearningApi(request, () => 7);
  await api.recommend(2, 9, 'application', 'retry-key');
  assert.equal(calls[0].url, '/api/learning-recommendations?modelVersion=concept-learning-v2');
  assert.deepEqual(JSON.parse(calls[0].init.body), { userId: 7, topicId: 2, profileId: 9, ability: 'application', topK: 5 });
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'retry-key');
  await api.recommendation(42);
  assert.equal(calls[1].url, '/api/learning-recommendations/42');
  assert.equal(calls[1].init.method, 'GET');
});

test('an old backend response is not silently presented as a v2 recommendation', async () => {
  const api = createLearningApi(async () => ({ modelVersion: 'concept-learning-v1' }), () => 7);
  await assert.rejects(api.recommend(2, 9, 'application', 'key'), /서버/);
});

test('v2 keys cannot collide with legacy requests or another ability/profile', () => {
  assert.notEqual(requestKind(9, 'application'), 'learningRequest:9:application');
  assert.notEqual(requestKind(9, 'application'), requestKind(10, 'application'));
  assert.notEqual(requestKind(9, 'application'), requestKind(9, 'reasoning'));
});

test('only a matching account/topic/profile/ability snapshot can be presented', () => {
  const r = { userId: 7, topicId: 2, profileId: 9, ability: 'application', modelVersion: 'concept-learning-v1' };
  assert.equal(currentRecommendation(r, 7, 2, 9, 'application'), r); // legacy stays identifiable
  for (const args of [[8,2,9,'application'],[7,3,9,'application'],[7,2,10,'application'],[7,2,9,'meaning']])
    assert.equal(currentRecommendation(r, ...args), null);
});

test('zero correct is not unmeasured and suggestions do not invent study order', () => {
  assert.equal(observationLabel({ state: 'unmeasured', responseCount: null, correctCount: null }), '아직 문제로 확인하지 않았어요');
  assert.equal(observationLabel({ state: 'needs-practice', responseCount: 2, correctCount: 0 }), '2문항 중 0문항 정답');
  const rows = [{conceptId:'matrix',state:'needs-practice'}, {conceptId:'eigenvalue',state:'unmeasured'}, {conceptId:'vector',state:'correct'}];
  assert.deepEqual(nextChecks(rows).map(r => r.conceptId), ['matrix', 'eigenvalue']);
  assert.deepEqual(rows.map(r => r.conceptId), ['matrix','eigenvalue','vector']);
});

test('source links cannot invoke scripts, local files, or embedded credentials', () => {
  for (const value of [null, '', 'javascript:alert(1)', 'file:///secret', 'https://u:p@example.org', '//example.org'])
    assert.equal(safeSourceUrl(value), null);
  assert.equal(safeSourceUrl('https://example.org/book?q=1'), 'https://example.org/book?q=1');
});
