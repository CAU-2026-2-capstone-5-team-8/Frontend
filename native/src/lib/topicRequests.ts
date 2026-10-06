import type { createHttpClient } from "./httpClient";

export type TopicRequestInput = {
  categoryId?: number;
  name: string;
  scope?: string;
  selectedSlug?: string;
  discoveryId?: string;
  providerCategory?: string;
  commonFieldId?: string;
};
export type TopicCandidate = {
  slug: string;
  name: string;
  parentCode: string;
  parentName: string;
};
export type TopicResolution = {
  status: "MATCH" | "BROAD" | "RELATED" | "UNKNOWN";
  message: string;
  candidates: TopicCandidate[];
};
export type TopicDiscovery = {
  id: string;
  query: string;
  status: "QUEUED" | "SEARCHING" | "FOUND" | "NO_RESULTS" | "FAILED";
  fields: {
    id: string;
    name: string;
    englishName: string;
    parentName: string;
    bookCount: number;
    providers: { id: string; status: string; bookCount: number; statusCode: number | null }[];
    samples: { title: string; authors: string[] }[];
  }[];
  groups: {
    category: string;
    bookCount: number;
    samples: { title: string; authors: string[] }[];
  }[];
};
export type TopicRequest = {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  scope: string;
  status:
    | "NEEDS_REVIEW"
    | "QUEUED"
    | "CHECKING"
    | "COLLECTING"
    | "NEEDS_INPUT"
    | "FAILED"
    | "BOOKS_READY";
  message: string | null;
  topicId: number | null;
  bookCount: number;
  createdAt: string;
  candidates: TopicCandidate[];
  content: {
    status:
      "QUEUED" | "PREPARING" | "CONCEPTS_READY" | "NEEDS_EVIDENCE" | "FAILED";
    conceptCount: number;
    mappedBookCount: number;
    questionSpecCount: number;
    concepts: { name: string; bookCount: number }[];
    questions: {
      status: "QUEUED" | "GENERATING" | "CANDIDATES_READY" | "REVIEWING" | "REVIEW_PENDING" | "REVIEW_BLOCKED" | "ACTIVE" | "FAILED";
      generatedCount: number;
      plannedCount: number;
      repairPending?: boolean;
    } | null;
  } | null;
};
export type CatalogRefreshState = {
  available: boolean;
  status:
    | "UNAVAILABLE"
    | "IDLE"
    | "QUEUED"
    | "RUNNING"
    | "COMPLETE"
    | "PARTIAL"
    | "FAILED";
  bookCount: number;
  addedBookCount: number;
  updatedAt: string | null;
  providers: {
    id: string;
    status: string;
    bookCount: number;
    statusCode: number | null;
  }[];
};
export type TopicPreparation = {
  topicId: number;
  status: "UNMANAGED" | "QUEUED" | "PREPARING" | "CONCEPTS_READY" | "NEEDS_EVIDENCE" | "GENERATING" | "CANDIDATES_READY" | "REVIEWING" | "REVIEW_PENDING" | "REVIEW_BLOCKED" | "ACTIVE" | "FAILED";
  generatedCount: number;
  plannedCount: number;
  reviewedCount: number;
  approvedCount: number;
  repairPending?: boolean;
};
export type TopicRequestSubmission = {
  request: TopicRequest | null;
  existingTopicId: number | null;
  replayed: boolean;
};

export function createTopicRequestApi(
  request: ReturnType<typeof createHttpClient>,
) {
  return {
    topicPreparation: (id: number) => request<TopicPreparation>(`/topics/${id}/preparation`),
    retryTopicPreparation: (id: number) => request<TopicPreparation>(`/topics/${id}/preparation/retry`, "POST"),
    topicCatalogState: (id: number) =>
      request<CatalogRefreshState>(`/topic-requests/catalog/${id}`),
    refreshTopicCatalog: (id: number, mode: "ALL" | "FAILED") =>
      request<CatalogRefreshState>(
        `/topic-requests/catalog/${id}/refresh`,
        "POST",
        { mode },
      ),
    topicRequests: () => request<TopicRequest[]>("/topic-requests"),
    resolveTopicName: (name: string) =>
      request<TopicResolution>("/topic-requests/resolve", "POST", { name }),
    discoverTopicBooks: (name: string) =>
      request<TopicDiscovery>("/topic-requests/discover", "POST", { name }),
    topicDiscovery: (id: string) =>
      request<TopicDiscovery>(`/topic-requests/discover/${id}`),
    submitTopicRequest: (input: TopicRequestInput) =>
      request<TopicRequestSubmission>("/topic-requests", "POST", input),
    retryTopicRequest: (id: number, name?: string, selectedSlug?: string) =>
      request<TopicRequest>(`/topic-requests/${id}/retry`, "POST", {
        ...(name === undefined ? {} : { name }),
        ...(selectedSlug === undefined ? {} : { selectedSlug }),
      }),
    retryTopicContent: (id: number) =>
      request<TopicRequest>(`/topic-requests/${id}/content/retry`, "POST", {}),
    retryTopicQuestions: (id: number) =>
      request<TopicRequest>(
        `/topic-requests/${id}/questions/retry`,
        "POST",
        {},
      ),
  };
}
