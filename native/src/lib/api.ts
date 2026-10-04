import { createLibraryApi } from "./libraryApi";
import { createLearningApi } from "./learningRecommendations";
import { Platform } from "react-native";
import { authSession, type AuthSession } from "./authSession";
import { createHttpClient, ApiError } from "./httpClient";
import type {
  AccountProfile,
  AccountUpdate,
  ReadinessOverview,
  ReadinessHistory,
} from "./accountTypes";
import type {
  QuestionPreview,
  Book,
  BookPage,
  Graph,
  Profile,
  Session,
  Topic,
} from "./types";

export { ApiError } from "./httpClient";

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export const API_BASE: string =
  Platform.OS === "web"
    ? "/api"
    : configuredBase || "http://127.0.0.1:8087/api";
const request = createHttpClient(API_BASE, authSession);
function userId() {
  const session = authSession.getSnapshot().session;
  if (!session) throw new ApiError("로그인이 필요합니다.", 401);
  return session.userId;
}
export const api = {
  ...createLibraryApi(request, userId),
  ...createLearningApi(request, userId),
  login: (email: string, password: string) =>
    request<AuthSession>("/auth/login", "POST", { email, password }, {}, false),
  register: (email: string, password: string, displayName: string) =>
    request<AuthSession>(
      "/auth/register",
      "POST",
      { email, password, displayName },
      {},
      false,
    ),
  revoke: (session: AuthSession) =>
    request<void>(
      "/auth/logout",
      "POST",
      undefined,
      { Authorization: `Bearer ${session.accessToken}` },
      false,
    ),
  me: () => request<AccountProfile>("/me"),
  updateMe: (body: AccountUpdate) =>
    request<AccountProfile>("/me", "PUT", body),
  readiness: () => request<ReadinessOverview>("/me/readiness"),
  history: (topicId: number, page = 0) =>
    request<ReadinessHistory>(
      `/me/readiness/${topicId}/history?page=${page}&size=5`,
    ),
  questionPreview: () =>
    request<QuestionPreview>("/assessments/concept-preview"),
  questionPreviewSummary: () =>
    request<{ candidateCount: number; topicIds: string[] }>(
      "/assessments/concept-preview/summary",
    ),
  topics: () => request<Topic[]>("/topics", "GET", undefined, {}, false),
  books: (topicId: number, page = 0) =>
    request<BookPage>(
      `/books?topicId=${topicId}&page=${page}&size=12`,
      "GET",
      undefined,
      {},
      false,
    ),
  book: (id: number) =>
    request<Book>(`/books/${id}`, "GET", undefined, {}, false),
  graph: (topicId: number, bookId?: number) =>
    request<Graph>(
      `/topics/${topicId}/concept-map${bookId ? `?bookId=${bookId}` : ""}`,
      "GET",
      undefined,
      {},
      false,
    ),
  createSession: (topicId: number) =>
    request<Session>("/assessments/concepts", "POST", {
      userId: userId(),
      topicId,
    }),
  session: (id: number) => request<Session>(`/assessments/${id}`),
  answer: (
    sessionId: number,
    questionId: number,
    value: { knowsConcept: boolean } | { selectedChoiceIndex: number },
  ) =>
    request<Session["questions"][number]>(
      `/assessments/${sessionId}/answers/${questionId}`,
      "PUT",
      value,
    ),
  complete: (id: number) =>
    request<{ profile: Profile }>(`/assessments/${id}/complete`, "POST"),
  profile: (topicId: number) =>
    request<Profile>(`/users/${userId()}/profiles/${topicId}`),
};
