import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { api, ApiError } from "../lib/api";
import {
  authSession,
  validSession,
  type AuthSession,
} from "../lib/authSession";
import { readStoredSession, storeSession } from "../lib/sessionStorage";

type AuthState = {
  session: AuthSession | null;
  revision: number;
  ready: boolean;
  busy: boolean;
  error: string | null;
  signIn: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    authSession.subscribe,
    authSession.getSnapshot,
    authSession.getSnapshot,
  );
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(false);
  useEffect(() => {
    let active = true;
    const unsubscribe = authSession.subscribe(() => {
      const current = authSession.getSnapshot();
      void storeSession(current.session).catch(() => {
        if (active && authSession.getSnapshot() === current)
          setError("이 기기에 로그인 상태를 저장하지 못했어요.");
      });
    });
    const initial = authSession.getSnapshot();
    void (async () => {
      try {
        const saved = await readStoredSession();
        if (!active || authSession.getSnapshot() !== initial) return;
        const session: unknown = saved ? JSON.parse(saved) : null;
        if (validSession(session)) {
          authSession.replace(session);
          const restored = authSession.getSnapshot();
          const me = await api.me();
          if (me.userId !== session.userId)
            authSession.clearIfCurrent(restored);
        } else if (saved) await storeSession(null);
      } catch (e) {
        if (active && !(e instanceof ApiError && e.status === 401)) {
          if (e instanceof SyntaxError)
            await storeSession(null).catch(() => {});
          else
            setError("로그인 상태를 확인하지 못했어요. 연결을 확인해 주세요.");
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!snapshot.session) return;
    const timer = setTimeout(
      () => authSession.clearIfCurrent(snapshot),
      Math.max(0, Date.parse(snapshot.session.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [snapshot]);

  async function signIn(email: string, password: string, displayName?: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const next =
        displayName === undefined
          ? await api.login(email.trim(), password)
          : await api.register(email.trim(), password, displayName.trim());
      if (!validSession(next))
        throw new Error("로그인 응답을 확인하지 못했어요.");
      try {
        await storeSession(next);
      } catch {
        await api.revoke(next).catch(() => {});
        throw new Error(
          "로그인 정보를 저장하지 못했어요. 브라우저 또는 기기의 저장소 설정을 확인해 주세요.",
        );
      }
      authSession.replace(next);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    const old = authSession.getSnapshot().session;
    authSession.replace(null);
    try {
      await storeSession(null);
      if (old) await api.revoke(old);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setError(
          "이 기기에서는 로그아웃했지만 저장소 또는 서버 처리를 확인하지 못했어요. 연결을 확인해 주세요.",
        );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{ ...snapshot, ready, busy, error, signIn, signOut }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw Error("AuthProvider missing");
  return value;
}
