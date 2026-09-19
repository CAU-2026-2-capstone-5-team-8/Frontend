import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi, progress} from '../src/api.js';

test('false answers count as answered, missing answers do not', () => {
  assert.deepEqual(progress([{knowsConcept:false},{knowsConcept:true},{knowsConcept:null}]), {answered:2,total:3,complete:false});
  assert.equal(progress([]).complete,false);
});
test('answer sends issued question ID and a boolean false', async () => {
  let captured;
  const api=createApi(async (url,options)=>{captured={url,options};return new Response('{"id":12,"knowsConcept":false}');});
  await api.answer(7,12,false);
  assert.equal(captured.url,'/api/assessments/7/answers/12');
  assert.equal(captured.options.method,'PUT');
  assert.deepEqual(JSON.parse(captured.options.body),{knowsConcept:false});
});
test('upstream HTML is not displayed as an error',async()=>{
  const api=createApi(async()=>new Response('<html>secret stack trace</html>',{status:502}));
  await assert.rejects(api.topics(),e=>!e.message.includes('secret') && e.status===502);
});
test('API errors retain Korean message and trace id for retry',async()=>{
  const api=createApi(async()=>new Response(JSON.stringify({code:'ML_TIMEOUT',message:'응답 시간이 초과되었습니다.',traceId:'abc'}),{status:504}));
  await assert.rejects(api.complete(3),e=>e.code==='ML_TIMEOUT'&&e.traceId==='abc');
});
test('reject invalid identifiers and nonboolean answers before network',async()=>{
  const api=createApi(()=>{throw Error('network must not be called');});
  await assert.rejects(api.answer(1,2,'false'));
  await assert.rejects(api.session('../secret'));
});
