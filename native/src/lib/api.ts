import { Platform } from "react-native";
import type {
  Ability,
  Book,
  BookPage,
  Graph,
  Profile,
  Recommendation,
  Session,
  Topic,
} from "./types";

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : configuredBase || "http://127.0.0.1:8087/api";
export const USER_ID = Number(process.env.EXPO_PUBLIC_USER_ID || "1");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(API_BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      signal: controller.signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data === null)
      throw new ApiError(
        data?.message || "요청을 처리하지 못했어요. 다시 시도해 주세요.",
        response.status,
        data?.code,
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    clearTimeout(timeout);
  }
}
export const api = {
  topics: () => request<Topic[]>("/topics"),
  books: (topicId: number, page = 0) =>
    request<BookPage>(`/books?topicId=${topicId}&page=${page}&size=12`),
  book: (id: number) => request<Book>(`/books/${id}`),
  graph: (topicId: number, bookId?: number) =>
    request<Graph>(
      `/topics/${topicId}/concept-map${bookId ? `?bookId=${bookId}` : ""}`,
    ),
  createSession: (topicId: number) =>
    request<Session>("/assessments/concepts", "POST", {
      userId: USER_ID,
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
    request<Profile>(`/users/${USER_ID}/profiles/${topicId}`),
  recommendation: (id: number) =>
    request<Recommendation>(`/learning-recommendations/${id}`),
  recommend: (
    topicId: number,
    profileId: number,
    ability: Ability,
    key: string,
  ) =>
    request<Recommendation>(
      "/learning-recommendations",
      "POST",
      { userId: USER_ID, topicId, profileId, ability, topK: 5 },
      { "Idempotency-Key": key },
    ),
};
