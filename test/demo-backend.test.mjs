import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDemoBackend} from './demo-backend.mjs';

async function listen(server, t) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {server.close(resolve); server.closeAllConnections();}));
  return `http://127.0.0.1:${server.address().port}`;
}

test('mentor fixture mirrors measured Discovery-LA diagnostics and Top-5', async t => {
  const url=await listen(makeDemoBackend(),t);
  const response=await fetch(`${url}/api/recommendations`,{method:'POST'});
  assert.equal(response.status,201);
  const result=await response.json();
  assert.deepEqual(result.diagnostics,{
    requestedLimit:5,
    returnedCount:5,
    topicCandidateCount:83,
    personalizableCount:6,
    conceptOnlyCount:5,
    evidenceUnavailableCount:72,
    fallbackCount:77,
    personalizedCandidateShortage:0,
  });
  assert.equal(result.demoNote,'실측 Discovery-LA rank-v2 결과를 반영한 UI 데모입니다.');
  assert.deepEqual(result.items.map(item=>[item.rank,item.bookId,item.title]),[
    [1,'isbn13:9788961055680','현대 선형대수학'],
    [2,'isbn13:9788970505329','인공지능 시대의 선형대수학'],
    [3,'isbn13:9791156574446','해커스 편입수학 선형대수학 행렬/벡터'],
    [4,'isbn13:9788964214428','예제 중심의 선형대수학'],
    [5,'isbn13:9788952117441','선형대수와 군'],
  ]);
  assert.deepEqual(result.items.map(item=>[item.prerequisiteReadiness,item.directLearningOpportunity]),[
    [1,null],
    [1,null],
    [1,null],
    [.95,.475],
    [.8166666666666668,.34375],
  ]);
  assert.deepEqual(result.items[3].coveredConcepts,['eigenvalue','eigenvector','matrix','vector space']);
  assert.equal(result.items.some(item=>item.title==='Introduction to Linear Algebra'),false);
  assert.equal(Object.hasOwn(result.items[0],'prerequisiteAssessedCount'),false);
});
