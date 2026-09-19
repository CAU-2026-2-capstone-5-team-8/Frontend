export function progress(questions) {
  const answered = questions.filter(q => typeof q.knowsConcept === 'boolean').length;
  return {answered, total: questions.length, complete: questions.length > 0 && answered === questions.length};
}

const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('올바른 번호를 입력해 주세요.');
  return n;
};

export function createApi(fetcher = fetch) {
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetcher('/api' + path, {method,
        headers: {'Content-Type': 'application/json'},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
        signal: AbortSignal.timeout(20000)});
    } catch {
      throw new Error('서버 응답을 확인하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
    }
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || data === null) {
      const error = new Error(typeof data?.message === 'string' ? data.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
      Object.assign(error, {status: response.status, code: data?.code, traceId: data?.traceId});
      throw error;
    }
    return data;
  }
  return {
    topics: () => request('/topics'),
    create: async (userId, topicId) => request('/assessments', 'POST', {userId:id(userId), topicId:id(topicId)}),
    session: async sessionId => request(`/assessments/${id(sessionId)}`),
    answer: async (sessionId, questionId, knowsConcept) => {
      if (typeof knowsConcept !== 'boolean') throw new Error('답변을 선택해 주세요.');
      return request(`/assessments/${id(sessionId)}/answers/${id(questionId)}`, 'PUT', {knowsConcept});
    },
    complete: async sessionId => request(`/assessments/${id(sessionId)}/complete`, 'POST'),
    profile: async (userId, topicId) => request(`/users/${id(userId)}/profiles/${id(topicId)}`),
  };
}
