import type { createSessionStore } from "./authSession";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export class SessionChangedError extends Error {
  constructor() {
    super("로그인 계정이 바뀌었어요. 다시 시도해 주세요.");
  }
}
export function createHttpClient(
  base: string,
  sessions: ReturnType<typeof createSessionStore>,
  transport: typeof fetch = fetch,
) {
  return async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
    authenticated = true,
  ): Promise<T> {
    const snapshot = sessions.getSnapshot();
    if (
      authenticated &&
      (!snapshot.session ||
        Date.parse(snapshot.session.expiresAt) <= Date.now())
    ) {
      if (snapshot.session) sessions.clearIfCurrent(snapshot);
      throw new ApiError("로그인이 필요합니다.", 401, "AUTH_REQUIRED");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await transport(base + path, {
        method,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...(authenticated
            ? { Authorization: `Bearer ${snapshot.session!.accessToken}` }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data =
        response.status === 204
          ? undefined
          : await response.json().catch(() => null);
      // A response belonging to a previous login must never update the new account's UI.
      if (authenticated && sessions.getSnapshot() !== snapshot)
        throw new SessionChangedError();
      if (!response.ok) {
        if (authenticated && response.status === 401)
          sessions.clearIfCurrent(snapshot);
        throw new ApiError(
          data?.message || "요청을 처리하지 못했어요. 다시 시도해 주세요.",
          response.status,
          data?.code,
        );
      }
      if (data === null)
        throw new ApiError("서버 응답을 확인하지 못했어요.", response.status);
      return data as T;
    } catch (error) {
      if (error instanceof ApiError || error instanceof SessionChangedError)
        throw error;
      throw new Error("연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      clearTimeout(timeout);
    }
  };
}
