import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {makeServer} from '../server.mjs';

async function listen(server, t) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {server.close(resolve); server.closeAllConnections();}));
  return `http://127.0.0.1:${server.address().port}`;
}
test('proxy preserves false answers, path, query and API error status', async t => {
  const upstream = await listen(createServer(async (req, res) => {
    let body=''; for await (const chunk of req) body+=chunk;
    assert.equal(req.url, '/api/assessments/7/answers/12?source=demo');
    assert.equal(req.method, 'PUT');
    assert.deepEqual(JSON.parse(body), {knowsConcept:false});
    res.writeHead(409, {'Content-Type':'application/json'});
    res.end(JSON.stringify({code:'SESSION_LOCKED', message:'이미 완료된 진단입니다.'}));
  }), t);
  const url = await listen(makeServer(upstream), t);
  const response = await fetch(`${url}/api/assessments/7/answers/12?source=demo`, {method:'PUT', body:JSON.stringify({knowsConcept:false})});
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'SESSION_LOCKED');
});
test('static server exposes only frontend assets', async t => {
  const url=await listen(makeServer(), t);
  assert.equal((await fetch(url)).status, 200);
  for (const path of ['/server.mjs','/package.json','/.git/config','/test/api.test.mjs','/constructor','/toString']) {
    assert.equal((await fetch(url+path)).status, 404, path);
  }
});
test('upstream redirects are not followed', async t => {
  const upstream=await listen(createServer((req,res)=>res.writeHead(302, {Location:'http://example.invalid/secret'}).end()), t);
  const url=await listen(makeServer(upstream), t);
  const response=await fetch(url+'/api/topics');
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'BACKEND_UNAVAILABLE');
});
