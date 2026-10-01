const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const pageNumber=value=>{if(!Number.isSafeInteger(value)||value<0)throw Error('페이지 번호를 확인해 주세요.');return value;};

export function isQuestionAnswered(question) {
  if (!question || typeof question !== 'object') return false;
  if (question.answerMode === 'MULTIPLE_CHOICE') {
    return Number.isSafeInteger(question.selectedChoiceIndex) && question.selectedChoiceIndex >= 0;
  }
  if (question.answerMode === 'SELF_REPORT' || (question.answerMode == null && hasOwn(question, 'knowsConcept'))) {
    return typeof question.knowsConcept === 'boolean';
  }
  return false;
}

export function progress(questions) {
  const answered = questions.filter(isQuestionAnswered).length;
  return {answered, total: questions.length, complete: questions.length > 0 && answered === questions.length};
}

export function resumePosition(questions) {
  const unanswered = questions.findIndex(question => !isQuestionAnswered(question));
  return unanswered === -1 ? Math.max(0, questions.length - 1) : unanswered;
}

const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('올바른 번호를 입력해 주세요.');
  return n;
};

const answerBody = (answer, choiceCount) => {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('답변 형식을 확인해 주세요.');
  const keys = Object.keys(answer);
  const selfReport = hasOwn(answer, 'knowsConcept');
  const multipleChoice = hasOwn(answer, 'selectedChoiceIndex');
  if (selfReport === multipleChoice || keys.length !== 1) throw new Error('한 가지 답변만 선택해 주세요.');
  if (selfReport) {
    if (typeof answer.knowsConcept !== 'boolean') throw new Error('자기평가 답변을 선택해 주세요.');
    return {knowsConcept:answer.knowsConcept};
  }
  if (!Number.isSafeInteger(answer.selectedChoiceIndex) || answer.selectedChoiceIndex < 0) {
    throw new Error('객관식 답변을 선택해 주세요.');
  }
  if (choiceCount !== undefined) {
    if (!Number.isSafeInteger(choiceCount) || choiceCount < 1) throw new Error('선택지 수를 확인할 수 없습니다.');
    if (answer.selectedChoiceIndex >= choiceCount) throw new Error('선택지 범위를 확인해 주세요.');
  }
  return {selectedChoiceIndex:answer.selectedChoiceIndex};
};

export function createApi(fetcher = fetch) {
  async function request(path, method = 'GET', body, headers = {}) {
    let response;
    try {
      response = await fetcher('/api' + path, {method,
        headers: {'Content-Type': 'application/json', ...headers},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
        signal: AbortSignal.timeout(20000)});
    } catch {
      throw new Error('서버 응답을 확인하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
    }
    if (response.ok && response.status === 204) return null;
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || data === null) {
      const error = new Error(typeof data?.message === 'string' ? data.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
      Object.assign(error, {status: response.status, code: data?.code, traceId: data?.traceId});
      throw error;
    }
    return data;
  }
  const answer = async (sessionId, questionId, value, choiceCount) => request(
    `/assessments/${id(sessionId)}/answers/${id(questionId)}`,
    'PUT',
    answerBody(value, choiceCount),
  );
  return {
    books: async (page=0) => request(`/books?page=${pageNumber(page)}&size=20`),
    shelf: async (userId,page=0,status='') => request(`/users/${id(userId)}/shelf?page=${pageNumber(page)}&size=20${status?'&status='+encodeURIComponent(status):''}`),
    addShelf: async (userId,bookId) => request(`/users/${id(userId)}/shelf/${id(bookId)}`,'POST'),
    saveShelf: async (userId,bookId,status,note='') => {
      if(!['WANT_TO_READ','READING','FINISHED'].includes(status)||typeof note!=='string'||note.length>1000)throw Error('읽기 상태와 메모(1,000자 이내)를 확인해 주세요.');
      return request(`/users/${id(userId)}/shelf/${id(bookId)}`,'PUT',{status,note});
    },
    removeShelf: async (userId,bookId) => request(`/users/${id(userId)}/shelf/${id(bookId)}`,'DELETE'),
    bookReviews: async (bookId,page=0) => request(`/books/${id(bookId)}/reviews?page=${pageNumber(page)}&size=20`),
    saveReview: async (userId,bookId,difficulty,text) => {
      if(!['EASY','APPROPRIATE','HARD'].includes(difficulty)||typeof text!=='string'||!text.trim()||text.length>300)throw Error('체감 난이도와 후기(1~300자)를 확인해 주세요.');
      return request(`/users/${id(userId)}/reviews/${id(bookId)}`,'PUT',{difficulty,text});
    },
    removeReview: async (userId,bookId) => request(`/users/${id(userId)}/reviews/${id(bookId)}`,'DELETE'),
    topics: () => request('/topics'),
    create: async (userId, topicId) => request('/assessments', 'POST', {userId:id(userId), topicId:id(topicId)}),
    session: async sessionId => request(`/assessments/${id(sessionId)}`),
    diagnostics: async sessionId => request(`/assessments/${id(sessionId)}/diagnostics`),
    answer,
    answerSelfReport: async (sessionId, questionId, knowsConcept) => answer(sessionId, questionId, {knowsConcept}),
    answerMultipleChoice: async (sessionId, questionId, selectedChoiceIndex, choiceCount) => answer(
      sessionId,
      questionId,
      {selectedChoiceIndex},
      choiceCount,
    ),
    complete: async sessionId => request(`/assessments/${id(sessionId)}/complete`, 'POST'),
    profile: async (userId, topicId) => request(`/users/${id(userId)}/profiles/${id(topicId)}`),
    recommend: async (userId, topicId, idempotencyKey, topK = 5) => {
      if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw new Error('추천 요청 키가 필요합니다.');
      const limit = Number(topK);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) throw new Error('추천 도서 수를 확인해 주세요.');
      return request('/recommendations', 'POST', {
        userId:id(userId), topicId:id(topicId), challengeLevel:'BALANCED', topK:limit,
      }, {'Idempotency-Key':idempotencyKey});
    },
  };
}
