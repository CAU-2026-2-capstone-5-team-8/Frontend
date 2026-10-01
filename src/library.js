const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={WANT_TO_READ:'읽고 싶어요',READING:'읽는 중',FINISHED:'완독'};
const difficulties={EASY:'쉬웠어요',APPROPRIATE:'적당했어요',HARD:'어려웠어요'};
const options=(values,selected)=>Object.entries(values).map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
const pager=data=>`<div class="library-pages">${data.page>0?'<button type="button" class="secondary" data-page="previous">이전 페이지</button>':''}<span>${data.totalPages?`${data.page+1} / ${data.totalPages}`:''}</span>${data.page+1<data.totalPages?'<button type="button" class="secondary" data-page="next">다음 페이지</button>':''}</div>`;

const cover=(title,id)=>`<div class="book-cover cover-${Number(id)%3}" aria-hidden="true"><span>책길 서가</span><strong>${escape(title)}</strong><div class="cover-art"></div><small>도서 정보</small></div>`;
export function shelfMarkup(data){
  if(!Array.isArray(data?.content))throw Error('서재 정보를 확인할 수 없습니다.');
  return data.content.length?data.content.map(item=>`<article class="shelf-book" data-book="${escape(item.bookId)}">${cover(item.title,item.bookId)}<div class="book-information"><span class="status-chip">${escape(statuses[item.status]??item.status)}</span><h2>${escape(item.title)}</h2><p class="muted">${escape(item.author)}</p><details class="record-editor"><summary>기록 관리 <span aria-hidden="true">↗</span></summary><form data-shelf><label>읽기 상태<select name="status">${options(statuses,item.status)}</select></label><label>내 메모<textarea name="note" maxlength="1000" rows="3" placeholder="기억하고 싶은 내용을 남겨 보세요">${escape(item.note)}</textarea></label><small>메모는 공개 후기 목록에 표시하지 않습니다.</small><div class="actions"><button type="submit">독서 기록 저장</button><button type="button" class="secondary" data-remove-shelf>서재에서 제외</button></div></form><details class="review-editor"><summary>나의 공개 후기 ${item.review?'수정':'작성'}</summary><form data-review><label>체감 난이도<select name="difficulty" required><option value="">선택해 주세요</option>${options(difficulties,item.review?.difficulty)}</select></label><label>한줄평<textarea name="text" maxlength="300" required rows="3" placeholder="이 책은 어떤 독자에게 좋을까요?">${escape(item.review?.text??'')}</textarea></label><small>저장하면 다른 이용자에게 공개됩니다. 체감 난이도는 개인의 독서 경험입니다.</small><div class="actions"><button type="submit">후기 공개 저장</button>${item.review?'<button type="button" class="secondary" data-remove-review>후기 삭제</button>':''}</div></form></details></details><button type="button" class="secondary reviews-link" data-reviews>이 책의 후기 보기</button></div></div></article>`).join('')+pager(data):'<div class="empty-result"><strong>아직 서재가 비어 있어요.</strong><p>책 찾기에서 읽고 싶은 책을 담아 보세요.</p></div>';
}

export function reviewsMarkup(data){
  if(!Array.isArray(data?.content))throw Error('후기를 확인할 수 없습니다.');
  return (data.content.length?data.content.map(item=>`<article class="public-review"><div><strong>${escape(item.authorLabel)}</strong><span>${escape(difficulties[item.difficulty]??item.difficulty)}</span></div><p>${escape(item.text)}</p></article>`).join(''):'<div class="empty-result"><p>아직 공개된 후기가 없어요. 서재에서 첫 후기를 남겨 보세요.</p></div>')+pager(data);
}

export function mountLibrary(root,api,userId,onHome,initialMode='shelf'){
  let mode=initialMode,page=0,bookId=null,bookTitle='',busy=false;
  root.innerHTML=`<div class="library-heading"><div><p class="eyebrow">책과 함께 쌓이는 나의 기록</p><h1>나의 서재</h1></div><button class="secondary" type="button" data-home>진단으로 돌아가기</button></div><p class="muted">읽고 싶은 책부터, 다 읽은 책까지.</p><p class="demo-identity">데모 사용자 ${escape(userId)} · 로그인 없이 사용자 번호로 구분하는 체험 기능입니다.</p><div class="library-tabs"><button type="button" data-mode="shelf">내 서재</button><button type="button" class="secondary" data-mode="catalog">책 찾기</button></div><p class="library-message" role="status" hidden></p><div class="library-content"></div>`;
  const content=root.querySelector('.library-content'),message=root.querySelector('.library-message');
  const info=text=>{message.textContent=text;message.hidden=false;};
  async function action(fn){
    if(busy)return;busy=true;message.hidden=true;root.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=true);
    try{await fn();}catch(e){if(root.isConnected)info(e.message??'요청을 처리하지 못했습니다. 다시 시도해 주세요.');}
    finally{busy=false;root.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=false);}
  }
  async function render(){
    const data=mode==='shelf'?await api.shelf(userId,page):mode==='catalog'?await api.books(page):await api.bookReviews(bookId,page);
    if(!root.isConnected)return;
    const catalog=mode==='catalog';root.querySelector('.eyebrow').textContent=catalog?'새로운 배움이 시작되는 곳':'책과 함께 쌓이는 나의 기록';root.querySelector('.library-heading + .muted').textContent=catalog?'읽고 싶은 책을 발견하고, 다른 독자의 경험도 살펴보세요.':'읽고 싶은 책부터, 다 읽은 책까지.';root.querySelector('h1').textContent=catalog?'책 둘러보기':mode==='reviews'?'독자들의 이야기':'나의 서재';document.querySelector('#page-label').textContent=catalog?'책 둘러보기':mode==='reviews'?'책별 후기':'내 서재';document.querySelectorAll('.nav-item').forEach(button=>{if(button.id===(catalog?'catalog-nav':'library-nav'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});content.classList.toggle('book-grid',mode!=='reviews');root.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('secondary',!active);button.setAttribute('aria-pressed',String(active));});
    if(mode==='shelf')content.innerHTML=shelfMarkup(data);
    else if(mode==='reviews')content.innerHTML=`<h2>${escape(bookTitle)}</h2><p class="muted">독자들이 남긴 한줄평과 체감 난이도예요.</p>${reviewsMarkup(data)}`;
    else{
      content.innerHTML=(data.content.length?data.content.map(item=>`<article class="catalog-book" data-book="${escape(item.id)}">${cover(item.title,item.id)}<div class="book-information"><h2>${escape(item.title)}</h2><p class="muted">${escape(item.author)}</p><div class="actions"><button type="button" data-add>서재에 담기</button><button type="button" class="secondary" data-reviews>후기 보기</button></div></div></article>`).join(''):'<p>등록된 책이 없습니다.</p>')+pager(data);
    }
  }
  root.querySelector('[data-home]').onclick=onHome;
  root.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>action(async()=>{mode=button.dataset.mode;page=0;await render();}));
  content.addEventListener('submit',event=>{
    event.preventDefault();const form=event.target,article=form.closest('[data-book]'),id=Number(article.dataset.book),data=new FormData(form);
    action(async()=>{if(form.hasAttribute('data-shelf'))await api.saveShelf(userId,id,data.get('status'),data.get('note'));else await api.saveReview(userId,id,data.get('difficulty'),data.get('text'));await render();info('저장했어요.');});
  });
  content.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.type==='submit')return;
    const article=button.closest('[data-book]'),id=Number(article?.dataset.book);
    action(async()=>{
      if(button.hasAttribute('data-page'))page+=button.dataset.page==='next'?1:-1;
      else if(button.hasAttribute('data-reviews')){mode='reviews';bookId=id;bookTitle=article.querySelector('h2').textContent;page=0;}
      else if(button.hasAttribute('data-add')){await api.addShelf(userId,id);mode='shelf';page=0;}
      else if(button.hasAttribute('data-remove-shelf')){await api.removeShelf(userId,id);page=0;await render();info('서재에서 제외했어요. 공개 후기는 별도로 유지됩니다.');return;}
      else if(button.hasAttribute('data-remove-review')){await api.removeReview(userId,id);await render();info('공개 후기를 삭제했어요.');return;}
      else return;
      await render();
    });
  });
  action(render);
}
