const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={vocabulary:'어휘 이해',background_knowledge:'배경지식',comprehension:'개념 이해'};
const levels={easy:'기초',medium:'중간',hard:'심화'};
const concepts={matrix:'행렬',vector:'벡터','linear-system':'연립방정식'};
const count=n=>Number.isSafeInteger(n)&&n>=0;

export function diagnosticError(error){
  if(error.status===503)return '상세 진단 서비스가 아직 연결되지 않았습니다. 저장된 프로필과 도서 추천은 계속 이용할 수 있어요.';
  if(error.status===404)return '현재 서버에서는 상세 진단을 사용할 수 없습니다. 저장된 프로필은 아래에서 확인할 수 있어요.';
  return '상세 진단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export function renderDiagnostics(data){
  const d=data?.diagnostics;
  if(!d||!Array.isArray(d.concepts)||!Array.isArray(data.responseSources)||!count(d.untaggedResponseCount))throw Error('Invalid diagnostics');
  const sourceMap=new Map(data.responseSources.map(source=>[source.questionId,source.answerMode]));
  const rows=d.concepts.map(concept=>{
    if(!Array.isArray(concept.evidence)||!count(concept.responseCount))throw Error('Invalid concept');
    for(const cell of concept.evidence){
      if(!count(cell.responseCount)||!Array.isArray(cell.questionIds)||!Object.hasOwn(types,cell.questionType)||!Object.hasOwn(levels,cell.difficulty)||
        (cell.responseCount===0?cell.score!==null:typeof cell.score!=='number'||!Number.isFinite(cell.score)||cell.score<0||cell.score>1))throw Error('Invalid evidence');
    }
    const ids=new Set(concept.evidence.flatMap(cell=>cell.questionIds));
    const self=[...ids].filter(id=>sourceMap.get(id)==='SELF_REPORT').length;
    const mcq=[...ids].filter(id=>sourceMap.get(id)==='MULTIPLE_CHOICE').length;
    const next=concept.nextCheck;
    const nextText=next?`${next.reason==='review_observed_gap'?'복습할 부분':'다음에 확인할 부분'}: ${levels[next.difficulty]??next.difficulty} ${types[next.questionType]??next.questionType}`:'모든 수준에 응답 기록이 있습니다. 전체 숙달을 의미하지는 않아요.';
    return `<details class="concept-detail"><summary><span><strong>${escape(Object.hasOwn(concepts,concept.conceptId)?concepts[concept.conceptId]:concept.conceptId)}</strong><small>자기평가 ${self} · 객관식 ${mcq}</small></span><span class="detail-toggle">근거 보기</span></summary><p class="next-check">${escape(nextText)}</p><div class="evidence-scroll"><table class="evidence-table"><caption>문항 수준별 응답 점수</caption><thead><tr><th scope="col">평가 영역</th>${Object.values(levels).map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${Object.entries(types).map(([type,label])=>`<tr><th scope="row">${label}</th>${Object.keys(levels).map(level=>{const cell=concept.evidence.find(e=>e.questionType===type&&e.difficulty===level);return cell?.responseCount?`<td><strong>${Math.round(cell.score*100)}%</strong><small>${cell.responseCount}개 응답</small></td>`:'<td class="unobserved">미측정</td>';}).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }).join('');
  return `<p class="muted">답변한 문항의 수준과 영역을 확인해 보세요. 문항 수준은 책의 난이도와 다르며, 아래 비율은 응답 점수입니다.</p>${rows||'<p>연결된 개념별 근거가 없습니다.</p>'}${d.untaggedResponseCount?`<p class="note">${d.untaggedResponseCount}개 답변은 개념 정보가 없어 이 표에 포함되지 않았습니다.</p>`:''}<details class="diagnostic-notes"><summary>결과를 읽을 때 참고해 주세요</summary><p>자기평가는 ‘알고 있다’고 답한 기록이고, 객관식은 채점 결과입니다. 미측정은 해당 수준의 응답이 없다는 뜻입니다.</p>${Array.isArray(d.limitations)?`<ul>${d.limitations.map(text=>`<li>${escape(text)}</li>`).join('')}</ul>`:''}<small>진단 기준: ${escape(d.diagnosticVersion)}</small></details>`;
}

// Each mount owns its DOM node. A late response cannot overwrite a newer screen.
export async function loadDiagnostics(target,fetchDiagnostics){
  target.setAttribute('aria-busy','true');
  target.innerHTML='<p class="muted" role="status">개념별 진단을 불러오는 중…</p>';
  try{
    const data=await fetchDiagnostics();
    if(target.isConnected)target.innerHTML=renderDiagnostics(data);
  }catch(error){
    if(!target.isConnected)return;
    target.innerHTML=`<p class="muted" role="status">${escape(diagnosticError(error))}</p><button class="secondary" type="button">상세 진단 다시 불러오기</button>`;
    target.querySelector('button').onclick=()=>loadDiagnostics(target,fetchDiagnostics);
  }finally{target.removeAttribute('aria-busy');}
}
