// Browser UI-contract fixture only. This is not a synchronized production artifact or real Backend E2E.
import {createServer} from 'node:http';
let session;
const profile=()=>({sessionId:1, vocabulary:1/3, backgroundKnowledge:1/3, comprehension:1/3, calculationVersion:'stub-browser-fixture'});
const selfReportPrompts=[
  '행렬의 행과 열이라는 용어가 익숙한가요?',
  '벡터의 성분이라는 용어가 익숙한가요?',
  '연립방정식의 해라는 용어가 익숙한가요?',
  '행렬 크기를 행의 수와 열의 수로 표현하는 방법을 알고 있나요?',
  '두 벡터가 직교한다는 의미를 알고 있나요?',
  '선형 시스템을 행렬로 나타내는 방법을 알고 있나요?',
  null,
  '행렬의 특정 위치에 있는 원소를 표기하는 방법을 알고 있나요?',
  '연립방정식과 행렬 사이의 관계를 설명할 수 있나요?',
];
const v4Question={
  id:17,
  orderIndex:7,
  measurementArea:'COMPREHENSION',
  conceptId:'matrix',
  passage:'2.6 Definition An m×n matrix is a rectangular array of numbers with m rows\nand n columns. Each number in the matrix is an entry.\nWe usually denote a matrix with an upper case roman letter. For instance,\nA =\n(\n1 2.2 5\n3 4 −7\n)\nhas 2 rows and 3 columns and so is a 2×3 matrix. Read that aloud as “two-by-three”; the number of rows is always stated first. (The matrix has parentheses\naround it so that when two matrices are adjacent we can tell where one ends and\nthe other begins.) We name matrix entries with the corresponding lower-case\nletter, so that the entry in the second row and first column of the above array\nis a2,1 = 3.',
  prompt:'제시된 본문의 정의와 규칙을 적용할 때, 4개의 행과 3개의 열로 이루어진 수 배열에 대한 올바른 행렬 크기 표기 및 설명으로 가장 적절한 것은?',
  answerMode:'MULTIPLE_CHOICE',
  choices:[
    "3×4 행렬이며, 열의 수가 항상 먼저 오므로 '스리-바이-포(three-by-four)'라고 읽는다.",
    "3×4 행렬이며, 행의 수가 항상 먼저 오므로 '스리-바이-포(three-by-four)'라고 읽는다.",
    "4×3 행렬이며, 열의 수가 항상 먼저 오므로 '포-바이-스리(four-by-three)'라고 읽는다.",
    "4×3 행렬이며, 행의 수가 항상 먼저 오므로 '포-바이-스리(four-by-three)'라고 읽는다.",
  ],
  knowsConcept:null,
  selectedChoiceIndex:null,
};
const answered=q=>q.answerMode==='MULTIPLE_CHOICE'?Number.isSafeInteger(q.selectedChoiceIndex):typeof q.knowsConcept==='boolean';
createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Content-Type','application/json');
  const send=value=>res.end(JSON.stringify(value));
  if(req.url==='/api/topics')return send([{id:1,name:'수학',parentId:null},{id:2,name:'선형대수학',parentId:1}]);
  if(req.url==='/api/assessments'&&req.method==='POST'){
    const input=JSON.parse(body);
    const questions=selfReportPrompts.map((prompt,i)=>i===6?{...v4Question,choices:[...v4Question.choices],selectedChoiceIndex:null}:{
      id:i+11,
      orderIndex:i+1,
      measurementArea:['VOCABULARY','BACKGROUND_KNOWLEDGE','COMPREHENSION'][Math.floor(i/3)],
      conceptId:['matrix','vector','linear-system'][i%3],
      passage:null,
      prompt,
      answerMode:'SELF_REPORT',
      choices:[],
      knowsConcept:null,
      selectedChoiceIndex:null,
    });
    session={id:1,...input,status:'IN_PROGRESS',questions};
    res.statusCode=201;return send(session);
  }
  if(req.url==='/api/assessments/1'&&session)return send(session);
  if(req.url?.startsWith('/api/assessments/1/answers/')&&session){
    const q=session.questions.find(q=>q.id===Number(req.url.split('/').at(-1)));
    if(q){
      let input;
      try{input=JSON.parse(body);}catch{/* Invalid input uses the same fixture error response. */}
      const keys=input&&typeof input==='object'&&!Array.isArray(input)?Object.keys(input):[];
      if(q.answerMode==='SELF_REPORT'&&keys.length===1&&typeof input.knowsConcept==='boolean'){
        q.knowsConcept=input.knowsConcept;q.selectedChoiceIndex=null;return send(q);
      }
      if(q.answerMode==='MULTIPLE_CHOICE'&&keys.length===1&&Number.isSafeInteger(input.selectedChoiceIndex)&&input.selectedChoiceIndex>=0&&input.selectedChoiceIndex<q.choices.length){
        q.knowsConcept=null;q.selectedChoiceIndex=input.selectedChoiceIndex;return send(q);
      }
      res.statusCode=400;return send({code:'INVALID_ANSWER',message:'문항 형식에 맞는 답변을 보내 주세요.'});
    }
  }
  if(req.url==='/api/assessments/1/complete'&&session){
    if(!session.questions.every(answered)){res.statusCode=409;return send({code:'ASSESSMENT_INCOMPLETE',message:'모든 문항에 답해 주세요.'});}
    session.status='COMPLETED';return send({...session,profile:profile()});
  }
  if(req.url==='/api/assessments/1/diagnostics'&&session){
    if(session.status!=='COMPLETED'){res.statusCode=409;return send({message:'진단을 먼저 완료해 주세요.'});}
    if(process.env.DIAGNOSTICS_UNAVAILABLE==='1'){res.statusCode=503;return send({message:'Diagnostic fixture unavailable'});}
    const types=['vocabulary','background_knowledge','comprehension'],levels=['easy','medium','hard'];
    const result=q=>q.answerMode==='MULTIPLE_CHOICE'?(q.selectedChoiceIndex===3?1:0):(q.knowsConcept?1:0);
    const concepts=[...new Set(session.questions.map(q=>q.conceptId))].map(conceptId=>{
      const questions=session.questions.filter(q=>q.conceptId===conceptId);
      const evidence=levels.flatMap((difficulty,level)=>types.map((questionType,type)=>{
        const matches=questions.filter(q=>Math.floor((q.orderIndex-1)/3)===type&&level===type);
        return {difficulty,questionType,responseCount:matches.length,score:matches.length?matches.reduce((sum,q)=>sum+result(q),0)/matches.length:null,fullCreditCount:matches.filter(q=>result(q)===1).length,questionIds:matches.map(q=>String(q.id))};
      }));
      const gap=evidence.find(e=>e.responseCount>e.fullCreditCount),missing=evidence.find(e=>!e.responseCount),next=gap??missing;
      return {conceptId,responseCount:questions.length,observedScore:questions.reduce((sum,q)=>sum+result(q),0)/questions.length,evidence,fullyObserved:!missing,nextCheck:next?{questionType:next.questionType,difficulty:next.difficulty,reason:gap?'review_observed_gap':'unassessed'}:null};
    });
    return send({sessionId:1,diagnostics:{responseCount:session.questions.length,untaggedResponseCount:0,concepts,diagnosticVersion:'browser-fixture-only',limitations:['화면 검증용 샘플입니다. 실제 ML 진단 결과가 아닙니다.']},responseSources:session.questions.map(q=>({questionId:String(q.id),assessmentQuestionId:q.id,answerMode:q.answerMode}))});
  }
  if(req.url==='/api/recommendations'&&req.method==='POST'){
    res.statusCode=201;return send({id:1,modelVersion:'rank-prerequisite-first-v2',diagnostics:{personalizedCandidateShortage:0},items:[
      {id:1,bookId:1,rank:1,title:'Introduction to Linear Algebra',author:'Gilbert Strang',prerequisiteReadiness:.8,prerequisiteAssessedCount:4,prerequisiteTotalCount:5,directLearningOpportunity:.4,directAssessedCount:3,directTotalCount:6,coveredConcepts:['matrix','vector'],reasons:['선행 개념 준비도가 충분합니다.','새롭게 배울 개념이 남아 있습니다.']}
    ]});
  }
  res.statusCode=404;send({message:'Fixture route not found'});
}).listen(Number(process.env.PORT||8089),'127.0.0.1',()=>console.log(`Browser fixture: http://127.0.0.1:${process.env.PORT||8089}`));
