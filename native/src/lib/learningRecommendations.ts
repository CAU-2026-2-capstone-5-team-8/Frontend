import type { createHttpClient } from "./httpClient";
import type {
  Ability,
  ChecklistConcept,
  Recommendation,
  Profile,
} from "./types";

export const learningModel = "concept-learning-v2";
export function supportsLearningProfile(profile: Profile | null) {
  const concepts = profile?.evidence?.conceptProfile;
  return (
    concepts?.version === "concept-abilities-v2" &&
    Array.isArray(concepts.abilities)
  );
}
export function conceptRole(
  row: Pick<ChecklistConcept, "isPrerequisite" | "isCovered">,
) {
  return row.isPrerequisite
    ? row.isCovered
      ? "책 안의 선수개념"
      : "책 밖의 선수개념 후보"
    : "책에서 다루는 개념";
}
export function createLearningApi(
  request: ReturnType<typeof createHttpClient>,
  userId: () => number,
) {
  return {
    recommendation: (id: number) =>
      request<Recommendation>(`/learning-recommendations/${id}`),
    recommend: async (
      topicId: number,
      profileId: number,
      ability: Ability,
      key: string,
    ) => {
      const result = await request<Recommendation>(
        `/learning-recommendations?modelVersion=${learningModel}`,
        "POST",
        { userId: userId(), topicId, profileId, ability, topK: 5 },
        { "Idempotency-Key": key },
      );
      if (result.modelVersion !== learningModel)
        throw new Error(
          "서버가 새 학습 준비도 방식을 아직 지원하지 않습니다. 서버 업데이트 후 다시 시도해 주세요.",
        );
      return result;
    },
  };
}
export const requestKind = (profileId: number, ability: Ability) =>
  `learningRequest:${learningModel}:${profileId}:${ability}`;

export function currentRecommendation(
  r: Recommendation | null,
  userId: number | undefined,
  topicId: number | undefined,
  profileId: number | undefined,
  ability: Ability,
) {
  return r?.userId === userId &&
    r?.topicId === topicId &&
    r?.profileId === profileId &&
    r?.ability === ability
    ? r
    : null;
}
export function observationLabel(
  row: Pick<ChecklistConcept, "state" | "responseCount" | "correctCount">,
) {
  return row.state === "unmeasured" ||
    row.responseCount === null ||
    row.correctCount === null
    ? "아직 문제로 확인하지 않았어요"
    : `${row.responseCount}문항 중 ${row.correctCount}문항 정답`;
}
export function nextChecks<T extends { state: string }>(rows: T[]) {
  return rows.filter((row) => row.state !== "correct");
}
export function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export const readinessLabels = {
  "ready-to-explore": "다음 배움 후보",
  "check-first": "선수개념 확인 필요",
  "foundation-gap": "기초 복습부터",
};
