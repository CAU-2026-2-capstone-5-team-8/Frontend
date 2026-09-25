// Browser-test fixture only. Never used by npm start or production.
import {createServer} from 'node:http';
let session;
const profile=()=>({sessionId:1, vocabulary:1/3, backgroundKnowledge:1/3, comprehension:1/3, calculationVersion:'stub-browser-fixture'});
createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Content-Type','application/json');
  const send=value=>res.end(JSON.stringify(value));
  if(req.url==='/api/topics')return send([{id:1,name:'컴퓨터공학',parentId:null},{id:2,name:'운영체제',parentId:1}]);
  if(req.url==='/api/assessments'&&req.method==='POST'){
    const input=JSON.parse(body);
    session={id:1,...input,status:'IN_PROGRESS',questions:Array.from({length:9},(_,i)=>({id:i+11,orderIndex:i+1,measurementArea:['VOCABULARY','BACKGROUND_KNOWLEDGE','COMPREHENSION'][Math.floor(i/3)],prompt:`${i+1}. 프로세스와 스레드의 차이를 설명할 수 있나요?`,knowsConcept:null}))};
    res.statusCode=201;return send(session);
  }
  if(req.url==='/api/assessments/1'&&session)return send(session);
  if(req.url?.startsWith('/api/assessments/1/answers/')&&session){
    const q=session.questions.find(q=>q.id===Number(req.url.split('/').at(-1)));
    if(q){q.knowsConcept=JSON.parse(body).knowsConcept;return send(q);}
  }
  if(req.url==='/api/assessments/1/complete'&&session){session.status='COMPLETED';return send({...session,profile:profile()});}
  if(req.url==='/api/recommendations'&&req.method==='POST'){
    res.statusCode=201;return send({id:1,modelVersion:'rank-prerequisite-first-v2',diagnostics:{personalizedCandidateShortage:0},items:[
      {id:1,bookId:1,rank:1,title:'Operating Systems',author:'William Stallings',prerequisiteReadiness:.8,prerequisiteAssessedCount:4,prerequisiteTotalCount:5,directLearningOpportunity:.4,directAssessedCount:3,directTotalCount:6,coveredConcepts:['process','memory management'],reasons:['선행 개념 준비도가 충분합니다.','새롭게 배울 개념이 남아 있습니다.']}
    ]});
  }
  res.statusCode=404;send({message:'Fixture route not found'});
}).listen(8089,'127.0.0.1',()=>console.log('Browser fixture: http://127.0.0.1:8089'));
