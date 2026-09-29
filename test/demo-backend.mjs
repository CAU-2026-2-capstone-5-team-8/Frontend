// Browser UI-contract fixture only. This is not a synchronized production artifact or real Backend E2E.
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

// This fixture mirrors the measured Discovery-LA rank-v2 output for mentor-demo UI verification.
// It is not a live ML/Backend E2E response. The paired profile remains stub-browser-fixture.
// Ranking values come from rank-v2-results.json; authors and concepts come from the paired
// Data-Pipeline canonical metadata and concept-mapping artifact. Missing rank fields stay absent.
export const mentorDemoRecommendation={
  id:'discovery-la-ranking-pilot-20260929',
  modelVersion:'rank-prerequisite-first-v2',
  demoNote:'실측 Discovery-LA rank-v2 결과를 반영한 UI 데모입니다.',
  qualityNote:'현재는 전공서/수험서 품질 필터 적용 전 결과입니다.',
  diagnostics:{
    requestedLimit:5,
    returnedCount:5,
    topicCandidateCount:83,
    personalizableCount:6,
    conceptOnlyCount:5,
    evidenceUnavailableCount:72,
    fallbackCount:77,
    personalizedCandidateShortage:0,
  },
  items:[
    {bookId:'isbn13:9788961055680',rank:1,title:'현대 선형대수학',author:'이상구,김덕선 공저',prerequisiteReadiness:1,prerequisiteCoverage:1,directLearningOpportunity:null,directCoverage:0,coveredConcepts:['rank']},
    {bookId:'isbn13:9788970505329',rank:2,title:'인공지능 시대의 선형대수학',author:'김대수,김경동 저',prerequisiteReadiness:1,prerequisiteCoverage:1,directLearningOpportunity:null,directCoverage:0,coveredConcepts:['rank']},
    {bookId:'isbn13:9791156574446',rank:3,title:'해커스 편입수학 선형대수학 행렬/벡터',author:'홍창의 저',prerequisiteReadiness:1,prerequisiteCoverage:1,directLearningOpportunity:null,directCoverage:0,coveredConcepts:['rank']},
    {bookId:'isbn13:9788964214428',rank:4,title:'예제 중심의 선형대수학',author:'민만식,황상민 공저',prerequisiteReadiness:.95,prerequisiteCoverage:1,directLearningOpportunity:.475,directCoverage:1,coveredConcepts:['eigenvalue','eigenvector','matrix','vector space']},
    {bookId:'isbn13:9788952117441',rank:5,title:'선형대수와 군',author:'이인석 저',prerequisiteReadiness:.8166666666666668,prerequisiteCoverage:1,directLearningOpportunity:.34375,directCoverage:.8,coveredConcepts:['basis','diagonalization','dimension','gaussian elimination','inner product','matrix','orthogonality','rank','vector','vector space']},
  ],
};
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
export function makeDemoBackend(){
let session;
return createServer(async(req,res)=>{
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
  if(req.url==='/api/recommendations'&&req.method==='POST'){
    res.statusCode=201;return send(mentorDemoRecommendation);
  }
  res.statusCode=404;send({message:'Fixture route not found'});
});
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  makeDemoBackend().listen(8089,'127.0.0.1',()=>console.log('Browser fixture: http://127.0.0.1:8089'));
}
