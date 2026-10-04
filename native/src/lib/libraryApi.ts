import type { createHttpClient } from "./httpClient";

export type ReadingStatus = "WANT_TO_READ" | "READING" | "FINISHED";
export type Difficulty = "EASY" | "APPROPRIATE" | "HARD";
export type OwnReview = { difficulty: Difficulty; text: string };
export type ShelfEntry = {
  coverUrl?: string | null;
  bookId: number;
  title: string;
  author: string;
  status: ReadingStatus;
  note: string;
  updatedAt: string;
  review: OwnReview | null;
};
export type PublicReview = OwnReview & {
  authorLabel: string;
  updatedAt: string;
};
export type LibraryPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export const readingOptions: { value: ReadingStatus; label: string }[] = [
  { value: "WANT_TO_READ", label: "읽고 싶어요" },
  { value: "READING", label: "읽는 중" },
  { value: "FINISHED", label: "완독" },
];
export const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "쉬웠어요" },
  { value: "APPROPRIATE", label: "적당했어요" },
  { value: "HARD", label: "어려웠어요" },
];
export function createLibraryApi(
  request: ReturnType<typeof createHttpClient>,
  userId: () => number,
) {
  return {
    shelf: (page = 0, status?: ReadingStatus) =>
      request<LibraryPage<ShelfEntry>>(
        `/users/${userId()}/shelf?page=${page}&size=12${status ? `&status=${status}` : ""}`,
      ),
    addToShelf: (bookId: number) =>
      request<ShelfEntry>(`/users/${userId()}/shelf/${bookId}`, "POST"),
    saveShelf: (bookId: number, status: ReadingStatus, note: string) =>
      request<ShelfEntry>(`/users/${userId()}/shelf/${bookId}`, "PUT", {
        status,
        note,
      }),
    removeFromShelf: (bookId: number) =>
      request<void>(`/users/${userId()}/shelf/${bookId}`, "DELETE"),
    saveReview: (bookId: number, review: OwnReview) =>
      request<OwnReview>(`/users/${userId()}/reviews/${bookId}`, "PUT", review),
    removeReview: (bookId: number) =>
      request<void>(`/users/${userId()}/reviews/${bookId}`, "DELETE"),
    bookReviews: (bookId: number, page = 0) =>
      request<LibraryPage<PublicReview>>(
        `/books/${bookId}/reviews?page=${page}&size=5`,
        "GET",
        undefined,
        {},
        false,
      ),
  };
}
