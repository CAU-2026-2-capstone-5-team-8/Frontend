// Loopback-only UI contract fixture. Never used by the application or a deployment.
// Books, account and observations are synthetic; not real recommendation evidence.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const topic = { id: 2, code: 'LA', name: '선형대수', mlTopicId: 'linear-algebra', parentId: 1, assessmentReady: true, conceptAssessmentReady: true };
const hash = 'sha256:' + 'a'.repeat(64);
const graph = { topicId: 'linear-algebra', version: 'fixture', nodes: [{id:'matrix',label:'행렬'}, {id:'eigenvalue',label:'고유값'}], edges:[{source:'matrix',target:'eigenvalue'}] };
const row = (id, state) => ({ conceptId:id, state, isCovered:true, isPrerequisite:id === 'matrix',
  responseCount:state === 'unmeasured' ? null : 2, correctCount:state === 'unmeasured' ? null : state === 'correct' ? 2 : 0,
  nextAction:state === 'unmeasured' ? 'assess-concept' : state === 'correct' ? 'continue-learning' : 'review-concept',
  dependsOn:id === 'matrix' ? [] : ['matrix'], requiredFor:id === 'matrix' ? ['eigenvalue'] : [], teachingSufficiency:'unverified',
  evidence:id === 'matrix' ? [{conceptId:id,evidenceId:'synthetic-toc-1',sourceId:'synthetic-source',sourceUrl:'https://example.org/book',evidenceType:'toc_same_work',editionRelation:'same_work',tocPath:['1장 행렬의 이해','1.2 행렬과 연산'],matchingAlias:'행렬',matchMethod:'fixture',provenanceHash:hash}] : [],
});
const books = [{id:11,title:'선형대수의 첫 연결',author:'화면 검증용 도서',description:'이 도서와 진단 응답은 UI 검증을 위한 가상 자료입니다. 실제 도서 추천이 아닙니다.'}, {id:12,title:'행렬에서 고유값까지',author:'화면 검증용 도서',description:null}].map(b => ({...b,isbn:null,topics:[{id:2,name:'선형대수',tocEntryCount:2,coveredConceptCount:2}]}));
export function recommendation(ability = 'application') {
  const rows = [row('matrix',ability === 'meaning' ? 'correct' : 'needs-practice'),row('eigenvalue','unmeasured')];
  return {id:42,userId:7,topicId:2,profileId:9,ability,modelVersion:'concept-learning-v2',conceptProfileVersion:'concept-abilities-v2',
    candidateCount:3,mappedCandidateCount:ability === 'reasoning' ? 0 : 2,unmappedCandidateCount:ability === 'reasoning' ? 3 : 1,items:ability === 'reasoning' ? [] : books.map((b,i) => ({
      bookId:b.id,title:b.title,author:b.author,rank:i+1,status:ability === 'meaning' ? 'ready-to-explore' : 'foundation-gap',reviewOnly:false,
      foundationStatus:'observed-graph-candidates',coveredConcepts:['matrix','eigenvalue'],inferredPrerequisites:['matrix'],
      internalPrerequisites:['matrix'],externalPrerequisites:[],foundation:[{conceptId:'matrix',state:rows[0].state}],targets:rows.map(({conceptId,state})=>({conceptId,state})),
      practiceConceptCount:ability === 'meaning' ? 0 : 1,unmeasuredConceptCount:1,reasons:['책 안에 등장하는 행렬도 선수개념 확인에 포함했어요.'],
      sourceArtifactVersion:'synthetic-ui-fixture',sourceArtifactHash:hash,
      readingChecklist:{version:'reading-checklist-v2',interpretation:'observed_answers_not_calibrated_mastery',orderPolicy:'prerequisites-first-stable-concept-id',concepts:rows,limitations:['검증용 자료입니다.']},
    }))};
}
export function createLearningFixture() {
  const saved = new Map(); let counter = 42;
  return createServer(async (req,res) => {
    const url = new URL(req.url,'http://localhost');
    const send = (data,status=200) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    let body = ''; for await (const part of req) body += part;
    const input = body ? JSON.parse(body) : {};
    const path = url.pathname;
    if(path === '/api/auth/login') return input.email === 'ui@example.test' && input.password === 'fixture-only-password' ? send({userId:7,accessToken:'f'.repeat(43),expiresAt:new Date(Date.now()+3600000).toISOString()}) : send({message:'검증용 계정만 사용할 수 있습니다.'},401);
    if(path === '/api/auth/logout') {res.writeHead(204).end();return;}
    if(path === '/api/topics') return send([topic]);
    if(path === '/api/me') return send({userId:7,email:'ui@example.test',displayName:'UI 검증 계정',bio:'가상 자료로 검증 중',avatarKey:'BOOK',interests:[],createdAt:'2026-10-04T00:00:00Z'});
    if(path === '/api/me/readiness') return send({latestProfiles:[],unassessedInterests:[],completedAssessmentCount:0,limitations:['가상 검증 계정입니다.']});
    if(path === '/api/users/7/profiles/2') return send({id:9,userId:7,topicId:2,sessionId:8,calculationVersion:'fixture',completedAt:'2026-10-04T00:00:00Z',evidence:{conceptProfile:{version:process.env.LEGACY_PROFILE === '1' ? 'concept-abilities-v1' : 'concept-abilities-v2',abilities:[{conceptId:'matrix',ability:'application',score:0,responseCount:2,correctCount:0,questionIds:['fixture1','fixture2'],operations:[]}],selfReports:[],unclassifiedResponseCount:0,interpretation:'fixture'}}});
    if(path === '/api/learning-recommendations' && req.method === 'POST') {
      if(url.searchParams.get('modelVersion') !== 'concept-learning-v2' || !req.headers['idempotency-key'] || input.userId !== 7) return send({message:'invalid contract'},400);
      if(process.env.FAIL_RECOMMENDATION === '1') return send({message:'검증용: 추천 서버에 연결할 수 없습니다.'},503);
      const key = req.headers['idempotency-key'];
      if(!saved.has(key)) saved.set(key,{...recommendation(input.ability),id:counter++});
      return send(saved.get(key),201);
    }
    if(path.startsWith('/api/learning-recommendations/')) {
      const result = [...saved.values()].find(r=>r.id===Number(path.split('/').at(-1))) || recommendation();
      if(process.env.LEGACY_SNAPSHOT === '1' && !saved.size) {
        result.modelVersion = 'concept-learning-v1';
        result.items.forEach(item => {delete item.readingChecklist; delete item.internalPrerequisites; delete item.externalPrerequisites;});
      }
      return send(result);
    }
    if(path.includes('/concept-map')) return send({...graph,...(url.searchParams.has('bookId') ? {book:{id:Number(url.searchParams.get('bookId')),title:books[0].title,available:true,coveredConcepts:['matrix','eigenvalue'],depthStatus:'unverified'}} : {})});
    if(path === '/api/books') return send({content:books,page:0,totalPages:1,totalElements:2});
    if(/^\/api\/books\/\d+\/reviews$/.test(path)) return send({content:[],page:0,size:5,totalPages:0,totalElements:0});
    if(/^\/api\/books\/\d+$/.test(path)) return send(books.find(b=>b.id===Number(path.split('/').at(-1))));
    return send({message:'Fixture endpoint not provided'},404);
  });
}
if(import.meta.url === pathToFileURL(process.argv[1]).href) createLearningFixture().listen(18487,'127.0.0.1',()=>console.log('Synthetic UI fixture http://127.0.0.1:18487 (ui@example.test / fixture-only-password)'));
