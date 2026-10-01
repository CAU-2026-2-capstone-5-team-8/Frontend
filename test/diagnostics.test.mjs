import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderDiagnostics, diagnosticError, loadDiagnostics} from '../src/diagnostics.js';
import {createApi} from '../src/api.js';

const sample=()=>({sessionId:7,responseSources:[{questionId:'q1',answerMode:'SELF_REPORT'},{questionId:'q2',answerMode:'MULTIPLE_CHOICE'}],diagnostics:{responseCount:2,untaggedResponseCount:0,diagnosticVersion:'reader-depth-evidence-v1',concepts:[{conceptId:'matrix',observedScore:0,responseCount:2,fullyObserved:false,nextCheck:{difficulty:'easy',questionType:'vocabulary',reason:'review_observed_gap'},evidence:[{difficulty:'easy',questionType:'vocabulary',score:0,responseCount:2,fullCreditCount:0,questionIds:['q1','q2']},{difficulty:'hard',questionType:'comprehension',score:null,responseCount:0,fullCreditCount:0,questionIds:[]}]}],limitations:['표본이 적습니다.']}});
test('diagnostics uses GET on the completed session and rejects invalid IDs',async()=>{
  let path,options;const api=createApi(async(p,o)=>{path=p;options=o;return Response.json(sample());});
  await api.diagnostics(7);assert.equal(path,'/api/assessments/7/diagnostics');assert.equal(options.method,'GET');
  await assert.rejects(api.diagnostics('../x'));
});
test('zero score and missing evidence remain distinct, with response sources',()=>{
  const html=renderDiagnostics(sample());
  assert.match(html,/0%/);assert.match(html,/미측정/);assert.match(html,/자기평가 1/);assert.match(html,/객관식 1/);
  assert.match(html,/복습할 부분/);assert.doesNotMatch(html,/숙달|합격/);
});
test('all server strings are escaped and unknown concept IDs stay visible',()=>{
  const data=sample();data.diagnostics.concepts[0].conceptId='<img src=x onerror=alert(1)>';
  data.diagnostics.limitations=['<script>bad()</script>'];
  const html=renderDiagnostics(data);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);
});
test('unassessed next checks and empty concepts do not invent ability',()=>{
  const data=sample();data.diagnostics.concepts[0].nextCheck.reason='unassessed';
  assert.match(renderDiagnostics(data),/다음에 확인할 부분/);
  data.diagnostics.concepts=[];data.diagnostics.untaggedResponseCount=2;
  assert.match(renderDiagnostics(data),/개념별 근거가 없습니다/);assert.match(renderDiagnostics(data),/2개 답변/);
});
test('unavailable diagnostics has a useful message separate from the profile',()=>{
  assert.match(diagnosticError({status:503}),/연결되지 않았습니다/);
  assert.match(diagnosticError({status:404}),/사용할 수 없습니다/);
  assert.match(diagnosticError({status:504}),/다시/);
});
test('malformed diagnostics fails rather than fabricating a score',()=>{
  assert.throws(()=>renderDiagnostics({}));
  const data=sample();data.diagnostics.concepts[0].evidence[0].score=4;
  assert.throws(()=>renderDiagnostics(data));
});
test('a detached screen ignores a late response',async()=>{
  let resolve;
  const target={isConnected:true,innerHTML:'',setAttribute(){},removeAttribute(){}};
  const pending=loadDiagnostics(target,()=>new Promise(done=>{resolve=done;}));
  target.isConnected=false;target.innerHTML='new screen';resolve(sample());await pending;
  assert.equal(target.innerHTML,'new screen');
});
test('unavailable request can be retried without touching profile or recommendation',async()=>{
  let calls=0;const button={};
  const target={isConnected:true,innerHTML:'',setAttribute(){},removeAttribute(){},querySelector(){return button;}};
  await loadDiagnostics(target,async()=>{if(++calls===1)throw {status:503};return sample();});
  assert.match(target.innerHTML,/다시 불러오기/);
  await button.onclick();assert.equal(calls,2);assert.match(target.innerHTML,/행렬/);
});
