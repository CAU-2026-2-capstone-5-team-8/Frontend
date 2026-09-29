import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi, isQuestionAnswered, progress, resumePosition} from '../src/api.js';

test('mixed self-report and multiple-choice answers count toward progress', () => {
  const questions=[
    {answerMode:'SELF_REPORT',knowsConcept:false,selectedChoiceIndex:null},
    {answerMode:'MULTIPLE_CHOICE',knowsConcept:null,selectedChoiceIndex:0},
    {answerMode:'SELF_REPORT',knowsConcept:null,selectedChoiceIndex:null},
    {answerMode:'MULTIPLE_CHOICE',knowsConcept:null,selectedChoiceIndex:null},
  ];
  assert.deepEqual(progress(questions), {answered:2,total:4,complete:false});
  assert.deepEqual(progress(questions.slice(0,2)), {answered:2,total:2,complete:true});
  assert.equal(progress([]).complete,false);
});
test('legacy questions without answerMode remain limited self-report questions', () => {
  assert.equal(isQuestionAnswered({knowsConcept:false}),true);
  assert.equal(isQuestionAnswered({knowsConcept:null}),false);
  assert.equal(isQuestionAnswered({answerMode:'UNKNOWN',knowsConcept:true}),false);
});
test('resume selects the first unanswered question or the final answered question', () => {
  const questions=[
    {answerMode:'SELF_REPORT',knowsConcept:true},
    {answerMode:'MULTIPLE_CHOICE',selectedChoiceIndex:null},
    {answerMode:'SELF_REPORT',knowsConcept:null},
  ];
  assert.equal(resumePosition(questions),1);
  assert.equal(resumePosition(questions.map((question,index)=>index===1?{...question,selectedChoiceIndex:0}:{...question,knowsConcept:false})),2);
  assert.equal(resumePosition([]),0);
});
test('self-report answer sends issued question ID and a boolean false', async () => {
  let captured;
  const api=createApi(async (url,options)=>{captured={url,options};return new Response('{"id":12,"knowsConcept":false}');});
  await api.answerSelfReport(7,12,false);
  assert.equal(captured.url,'/api/assessments/7/answers/12');
  assert.equal(captured.options.method,'PUT');
  assert.deepEqual(JSON.parse(captured.options.body),{knowsConcept:false});
});
test('multiple-choice answer sends a zero-based selected choice index', async () => {
  let captured;
  const api=createApi(async (url,options)=>{captured={url,options};return new Response('{"id":17,"selectedChoiceIndex":3}');});
  await api.answerMultipleChoice(7,17,3,4);
  assert.equal(captured.url,'/api/assessments/7/answers/17');
  assert.equal(captured.options.method,'PUT');
  assert.deepEqual(JSON.parse(captured.options.body),{selectedChoiceIndex:3});
});
test('upstream HTML is not displayed as an error',async()=>{
  const api=createApi(async()=>new Response('<html>secret stack trace</html>',{status:502}));
  await assert.rejects(api.topics(),e=>!e.message.includes('secret') && e.status===502);
});
test('API errors retain Korean message and trace id for retry',async()=>{
  const api=createApi(async()=>new Response(JSON.stringify({code:'ML_TIMEOUT',message:'응답 시간이 초과되었습니다.',traceId:'abc'}),{status:504}));
  await assert.rejects(api.complete(3),e=>e.code==='ML_TIMEOUT'&&e.traceId==='abc');
});
test('reject invalid answer shapes before network',async()=>{
  let calls=0;
  const api=createApi(()=>{calls++;throw Error('network must not be called');});
  await assert.rejects(api.answerSelfReport(1,2,'false'));
  await assert.rejects(api.answerMultipleChoice(1,2,-1,4));
  await assert.rejects(api.answerMultipleChoice(1,2,1.5,4));
  await assert.rejects(api.answerMultipleChoice(1,2,4,4));
  await assert.rejects(api.answer(1,2,{knowsConcept:true,selectedChoiceIndex:0},4));
  await assert.rejects(api.answer(1,2,{}));
  assert.equal(calls,0);
});
test('reject invalid identifiers before network',async()=>{
  const api=createApi(()=>{throw Error('network must not be called');});
  await assert.rejects(api.session('../secret'));
});
test('recommendation sends v2 public request with idempotency key',async()=>{
  let captured;
  const api=createApi(async(url,options)=>{captured={url,options};return new Response('{"id":9,"items":[]}');});
  await api.recommend(1,2,'recommendation-key',5);
  assert.equal(captured.url,'/api/recommendations');
  assert.equal(captured.options.method,'POST');
  assert.equal(captured.options.headers['Idempotency-Key'],'recommendation-key');
  assert.deepEqual(JSON.parse(captured.options.body),{userId:1,topicId:2,challengeLevel:'BALANCED',topK:5});
});
test('recommendation rejects missing idempotency key and invalid limit',async()=>{
  const api=createApi(()=>{throw Error('network must not be called');});
  await assert.rejects(api.recommend(1,2,'',5));
  await assert.rejects(api.recommend(1,2,'key',21));
});
