import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import type { TopicPreparation as Preparation } from "../lib/topicRequests";
import { useAuth } from "../state/AuthContext";
import { Button, ErrorNotice, Loading, s } from "./ui";

const labels: Record<Preparation["status"], string> = {
  UNMANAGED: "",
  QUEUED: "개념 준비 대기",
  PREPARING: "책의 개념을 연결하고 있어요.",
  CONCEPTS_READY: "진단 문제 설계를 마쳤어요.",
  NEEDS_EVIDENCE: "진단을 준비하기에 목차 근거가 부족해요. 책은 살펴볼 수 있어요.",
  GENERATING: "진단 문제를 만들고 있어요.",
  CANDIDATES_READY: "문제 생성을 마쳤어요. 검토를 준비하고 있어요.",
  REVIEWING: "문제를 검토하고 필요한 내용을 보완하고 있어요.",
  REVIEW_PENDING: "문제 검토를 이어서 진행하고 있어요.",
  REVIEW_BLOCKED: "문제 검토에서 보완할 내용이 발견됐어요. 진단은 아직 열리지 않았어요.",
  ACTIVE: "맞춤 진단 준비가 끝났어요.",
  FAILED: "진단 준비가 중단됐어요. 저장된 결과부터 다시 이어갈 수 있어요.",
};

export function TopicPreparation({ topicId, onUpdated }: { topicId: number; onUpdated?: () => void }) {
  const { session } = useAuth();
  const [saved, setState] = useState<Preparation | null>(null);
  const state = saved?.topicId === topicId ? saved : null;
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const callback = useRef(onUpdated);
  const previous = useRef<string | null>(null);
  useEffect(() => { callback.current = onUpdated; }, [onUpdated]);
  useEffect(() => {
    if (!session) return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    previous.current = null;
    async function poll() {
      try {
        const result = await api.topicPreparation(topicId);
        if (mounted) {
          setState(result);
          setError(null);
          if (result.status !== previous.current && (result.status === "ACTIVE" || previous.current === "ACTIVE")) callback.current?.();
          previous.current = result.status;
        }
      } catch (e) { if (mounted) setError((e as Error).message); }
      finally { if (mounted) timer = setTimeout(() => void poll(), 5000); }
    }
    void poll();
    return () => { mounted = false; clearTimeout(timer); };
  }, [topicId, session]);
  async function retry() {
    setRetrying(true);
    try { setState(await api.retryTopicPreparation(topicId)); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setRetrying(false); }
  }
  if (!session || state?.status === "UNMANAGED") return null;
  const busy = state && (state.repairPending || ["QUEUED", "PREPARING", "CONCEPTS_READY", "GENERATING", "CANDIDATES_READY", "REVIEWING", "REVIEW_PENDING"].includes(state.status));
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      {state && <Text style={s.body}>{state.repairPending ? "검토 의견에 따라 문제를 보완하고 다시 확인해요." : labels[state.status]}</Text>}
      {busy && <Loading />}
      {state && state.plannedCount > 0 && state.status !== "ACTIVE" && (
        <Text style={s.sub}>문제 생성 {state.generatedCount}/{state.plannedCount}개 · 검토 {state.reviewedCount}/{state.plannedCount}개</Text>
      )}
      {state?.status === "FAILED" && <Button label={retrying ? "요청 중" : "진단 준비 이어서 시도"} secondary disabled={retrying} onPress={() => void retry()} />}
      {error && <ErrorNotice message={error} />}
    </View>
  );
}
