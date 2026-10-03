export type AuthSession = {
  userId: number;
  accessToken: string;
  expiresAt: string;
};
export type AuthSnapshot = { session: AuthSession | null; revision: number };

export function validSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const s = value as AuthSession;
  return (
    Number.isSafeInteger(s.userId) &&
    s.userId > 0 &&
    typeof s.accessToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(s.accessToken) &&
    typeof s.expiresAt === "string" &&
    Date.parse(s.expiresAt) > Date.now()
  );
}

export function createSessionStore() {
  let state: AuthSnapshot = { session: null, revision: 0 };
  const listeners = new Set<() => void>();
  const replace = (session: AuthSession | null) => {
    state = { session, revision: state.revision + 1 };
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    replace,
    clearIfCurrent(snapshot: AuthSnapshot) {
      if (state === snapshot) replace(null);
    },
  };
}
export const authSession = createSessionStore();

export function accountStorageKey(
  base: string,
  userId: number | null,
  topicId: number | null,
  kind: string,
) {
  return `bookpath:${base}:${userId ?? "guest"}:${topicId ?? "all"}:${kind}`;
}
