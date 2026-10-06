import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import type { CatalogRefreshState } from "../lib/topicRequests";
import { useAuth } from "../state/AuthContext";
import { Button, ErrorNotice, Loading, s } from "./ui";
import { TopicPreparation } from "./TopicPreparation";

const providerNames: Record<string, string> = {
  yes24: "YES24",
  open_library: "Open Library",
  google_books: "Google Books",
};
const providerStatus: Record<string, string> = {
  collected: "확인 완료",
  provider_failed: "다시 확인 필요",
  not_collected: "아직 확인 전",
  unmapped_language: "해외 검색어 준비 중",
  unmapped_category: "해외 분류 연결 준비 중",
};

export function CatalogRefresh({
  topicId,
  slug,
  onUpdated,
}: {
  topicId: number;
  slug: string | null;
  onUpdated?: () => void;
}) {
  const { session } = useAuth();
  const [state, setState] = useState<CatalogRefreshState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const callback = useRef(onUpdated);
  const completed = useRef<string | null>(null);
  const supported = !!slug && (slug.startsWith("search-") || slug.startsWith("field-"));
  const running = state?.status === "QUEUED" || state?.status === "RUNNING";
  useEffect(() => {
    callback.current = onUpdated;
  }, [onUpdated]);
  useEffect(() => {
    let active = true;
    if (!session || !supported) return;
    void api
      .topicCatalogState(topicId)
      .then((result) => {
        if (active) {
          setState(result);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [topicId, session, supported]);
  useEffect(() => {
    if (!running || !session) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await api.topicCatalogState(topicId);
        if (active) {
          setState(result);
          setError(null);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) timer = setTimeout(() => void poll(), 5000);
      }
    }
    timer = setTimeout(() => void poll(), 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [topicId, running, session]);
  useEffect(() => {
    if (
      state?.updatedAt &&
      ["COMPLETE", "PARTIAL"].includes(state.status) &&
      state.updatedAt !== completed.current
    ) {
      completed.current = state.updatedAt;
      callback.current?.();
    }
  }, [state]);

  async function reload() {
    try {
      setState(await api.topicCatalogState(topicId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function start(mode: "ALL" | "FAILED") {
    setSubmitting(true);
    setError(null);
    try {
      setState(await api.refreshTopicCatalog(topicId, mode));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }
  if (!session || !supported) return null;
  if (state && !state.available && !error) return null;
  return (
    <View style={{ gap: 12, paddingVertical: 16 }}>
      <Text style={s.body}>국내외 책 목록</Text>
      {state?.providers.map((provider) => (
        <Text key={provider.id} style={s.sub}>
          {providerNames[provider.id]} ·{" "}
          {providerStatus[provider.status] ?? "확인 중"}
          {provider.statusCode === 429 ? " (출처의 요청 한도)" : ""}
        </Text>
      ))}
      {running && (
        <>
          <Loading />
          <Text style={s.sub}>
            책을 확인하고 있어요. 기존 책은 계속 살펴볼 수 있어요.
          </Text>
        </>
      )}
      {state?.status === "COMPLETE" && (
        <Text style={s.sub}>
          갱신을 마쳤어요.{" "}
          {state.addedBookCount > 0
            ? `${state.addedBookCount}권이 추가됐어요.`
            : "이번 확인에서는 추가된 책이 없어요."}
        </Text>
      )}
      {state?.status === "PARTIAL" && (
        <Text style={s.sub}>
          일부 출처를 확인하지 못했어요. 확인된 책 {state.bookCount}권은 계속 볼
          수 있어요.
        </Text>
      )}
      {state?.status === "FAILED" && (
        <Text style={s.sub}>
          갱신을 마치지 못했어요. 기존 책 목록은 유지돼요.
        </Text>
      )}
      {error && <ErrorNotice message={error} retry={() => void reload()} />}
      <TopicPreparation topicId={topicId} onUpdated={onUpdated} />
      <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
        {state?.available && (
          <Button
            label={submitting ? "요청 중" : "책 목록 갱신"}
            secondary
            disabled={running || submitting}
            onPress={() => void start("ALL")}
          />
        )}
        {state?.available &&
          state.providers.some((p) => p.status === "provider_failed") && (
            <Button
              label="실패한 출처만 다시 확인"
              secondary
              disabled={running || submitting}
              onPress={() => void start("FAILED")}
            />
          )}
      </View>
    </View>
  );
}
