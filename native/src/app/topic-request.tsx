import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CatalogRefresh } from "../components/CatalogRefresh";
import { AccountField } from "../components/AccountField";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  s,
  colors,
} from "../components/ui";
import { api } from "../lib/api";
import type {
  TopicRequest,
  TopicResolution,
  TopicDiscovery,
} from "../lib/topicRequests";
import { useAuth } from "../state/AuthContext";
import { useLearning } from "../state/LearningContext";

export default function TopicRequestPage() {
  const params = useLocalSearchParams<{ name?: string }>();
  const { session } = useAuth();
  const { topics, selectTopic, refresh } = useLearning();
  const [name, setName] = useState(
    typeof params.name === "string" ? params.name.slice(0, 120) : "",
  );
  const readyIds = useRef(new Set<number>());
  const [requests, setRequests] = useState<TopicRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!session);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resolution, setResolution] = useState<TopicResolution | null>(null);
  const [discovery, setDiscovery] = useState<TopicDiscovery | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [correctedNames, setCorrectedNames] = useState<Record<number, string>>(
    {},
  );

  const preparing = requests.some(
    (item) =>
      ["QUEUED", "CHECKING", "COLLECTING"].includes(item.status) ||
      ["QUEUED", "PREPARING"].includes(item.content?.status ?? "") ||
      item.content?.questions?.repairPending ||
      ["QUEUED", "GENERATING", "CANDIDATES_READY", "REVIEWING", "REVIEW_PENDING"].includes(item.content?.questions?.status ?? ""),
  );

  useEffect(() => {
    let active = true;
    readyIds.current.clear();
    if (!session) return;
    void api
      .topicRequests()
      .then((items) => {
        if (active) {
          items.forEach((item) => { if (item.status === "BOOKS_READY") readyIds.current.add(item.id); });
          setRequests(items);
        }
      })
      .catch((e: Error) => {
        if (active) setListError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !preparing) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const items = await api.topicRequests();
        if (active) {
          setRequests(items);
          setListError(null);
          if (items.some((item) => item.status === "BOOKS_READY" && !readyIds.current.has(item.id)))
            await refresh();
          if (active) items.forEach((item) => { if (item.status === "BOOKS_READY") readyIds.current.add(item.id); });
        }
      } catch (e) {
        if (active) setListError((e as Error).message);
      } finally {
        if (active) timer = setTimeout(() => void poll(), 5000);
      }
    }
    timer = setTimeout(() => void poll(), 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session, preparing, refresh]);

  useEffect(() => {
    if (
      !session ||
      !discovery ||
      !["QUEUED", "SEARCHING"].includes(discovery.status)
    )
      return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const id = discovery.id;
    async function poll() {
      try {
        const result = await api.topicDiscovery(id);
        if (active) {
          setDiscovery(result);
          setError(null);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) timer = setTimeout(() => void poll(), 2000);
      }
    }
    timer = setTimeout(() => void poll(), 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session, discovery]);

  async function discoverBooks() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setExistingId(null);
    try {
      setDiscovery(await api.discoverTopicBooks(name.trim()));
      setResolution(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setLoading(true);
    setListError(null);
    try {
      setRequests(await api.topicRequests());
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function submit(selectedSlug?: string, providerCategory?: string, commonFieldId?: string) {
    if (busy) return;
    setError(null);
    setMessage(null);
    setExistingId(null);
    if (name.trim().length < 2) {
      setError("분야 이름을 2자 이상 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (selectedSlug === undefined && providerCategory === undefined && commonFieldId === undefined) {
        const checked = await api.resolveTopicName(name.trim());
        setResolution(checked);
        if (checked.status === "UNKNOWN") {
          setDiscovery(await api.discoverTopicBooks(name.trim()));
          setResolution(null);
          return;
        }
        if (checked.status !== "MATCH") return;
      }
      const result = await api.submitTopicRequest({
        name: name.trim(),
        ...(selectedSlug === undefined ? {} : { selectedSlug }),
        ...(commonFieldId === undefined ? {} : { discoveryId: discovery?.id, commonFieldId }),
        ...(providerCategory === undefined
          ? {}
          : { discoveryId: discovery?.id, providerCategory }),
      });
      const selectedName = resolution?.candidates.find(
        (candidate) => candidate.slug === selectedSlug,
      )?.name;
      setResolution(null);
      setDiscovery(null);
      if (result.existingTopicId !== null) {
        setExistingId(result.existingTopicId);
        setMessage(
          selectedName
            ? `${selectedName} 분야를 선택했어요. 이 분야의 책을 살펴보세요.`
            : "이미 등록된 분야예요. 기존 분야에서 책을 살펴보세요.",
        );
      } else if (result.request) {
        const saved = result.request;
        setRequests((items) => [
          saved,
          ...items.filter((item) => item.id !== saved.id),
        ]);
        setMessage(
          result.replayed
            ? "이미 접수된 요청이에요. 기존 요청을 보여드릴게요."
            : "요청을 접수했어요. 아래에서 준비 상태를 확인할 수 있어요.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function retry(request: TopicRequest, selectedSlug?: string) {
    if (retryingId !== null) return;
    setRetryingId(request.id);
    setListError(null);
    try {
      const saved = await api.retryTopicRequest(
        request.id,
        correctedNames[request.id],
        selectedSlug,
      );
      setRequests((items) =>
        items.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setRetryingId(null);
    }
  }

  async function retryContent(request: TopicRequest, questionStage = false) {
    if (retryingId !== null) return;
    setRetryingId(request.id);
    setListError(null);
    try {
      const saved = questionStage
        ? await api.retryTopicQuestions(request.id)
        : await api.retryTopicContent(request.id);
      setRequests((items) =>
        items.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setRetryingId(null);
    }
  }

  async function openTopic(id: number) {
    try {
      await refresh();
      const topic = (await api.topics()).find((item) => item.id === id);
      if (topic) {
        selectTopic(topic);
        router.replace("/");
      }
    } catch (e) {
      setListError((e as Error).message);
    }
  }

  return (
    <Page
      eyebrow="새 분야 요청"
      title="읽고 싶은 분야를 알려주세요."
      description="분야 이름을 확인하고 관련 책을 준비해요."
    >
      <View style={styles.content}>
        <Button
          label="책 둘러보기로"
          onPress={() => router.replace("/")}
          secondary
        />
        {!session ? (
          <Card>
            <Text style={s.body}>
              로그인하면 새 분야를 요청하고 접수 내역을 확인할 수 있어요.
            </Text>
            <Button
              label="로그인하기"
              onPress={() => router.push("/account")}
            />
          </Card>
        ) : (
          <>
            <Card>
              <AccountField
                label="분야 이름"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setMessage(null);
                  setExistingId(null);
                  setResolution(null);
                  setDiscovery(null);
                }}
                placeholder="예: 컴퓨터 네트워크"
                maxLength={120}
                editable={!busy}
              />
              <Text style={s.sub}>
                읽고 싶은 분야를 적어주세요. 처음 찾는 분야도 관련 책을 검색할
                수 있어요.
              </Text>
              {error && <ErrorNotice message={error} />}
              {resolution && resolution.status !== "MATCH" && (
                <View style={styles.contentProgress}>
                  <Text style={s.body}>{resolution.message}</Text>
                  <Button
                    label="입력한 이름으로 책 찾아보기"
                    onPress={() => void discoverBooks()}
                    disabled={busy}
                    secondary
                  />
                  {resolution.candidates.map((candidate) => (
                    <View key={candidate.slug} style={styles.candidate}>
                      <Text style={s.sub}>{candidate.parentName}</Text>
                      <Button
                        label={`${candidate.name} 분야 선택`}
                        onPress={() => void submit(candidate.slug)}
                        disabled={busy}
                        secondary
                      />
                    </View>
                  ))}
                </View>
              )}
              {discovery && (
                <View style={styles.contentProgress}>
                  {["QUEUED", "SEARCHING"].includes(discovery.status) && (
                    <>
                      <Loading />
                      <Text style={s.body}>
                        ‘{discovery.query}’ 관련 책과 분류를 찾고 있어요.
                      </Text>
                    </>
                  )}
                  {discovery.status === "NO_RESULTS" && (
                    <Text style={s.body}>
                      이번 검색에서는 이름과 분류를 확인할 수 있는 책을 찾지
                      못했어요. 다른 검색어로 다시 찾아보세요.
                    </Text>
                  )}
                  {discovery.status === "FAILED" && (
                    <>
                      <Text style={s.body}>
                        책 검색을 마치지 못했어요. 다시 시도해 주세요.
                      </Text>
                      <Button
                        label="책 검색 다시 시도"
                        onPress={() => void discoverBooks()}
                        disabled={busy}
                        secondary
                      />
                    </>
                  )}
                  {discovery.status === "FOUND" && (
                    <>
                      {discovery.fields?.map((field) => (
                        <View key={field.id} style={styles.candidate}>
                          <Text style={s.sub}>{field.parentName}</Text>
                          <Text style={s.cardTitle}>{field.name}</Text>
                          <Text style={s.sub}>{field.englishName}</Text>
                          <Text style={s.body}>관련 책 {field.bookCount}권을 찾았어요.</Text>
                          {field.providers.map((provider) => (
                            <Text key={provider.id} style={s.sub}>
                              {({ yes24: "YES24", open_library: "Open Library", google_books: "Google Books", national_library: "국립중앙도서관" } as Record<string, string>)[provider.id] ?? provider.id}
                              {provider.status === "collected"
                                ? ` · ${provider.bookCount}권 확인`
                                : provider.status === "not_configured"
                                  ? " · 연결 준비 중"
                                : provider.statusCode === 429
                                  ? " · 요청 한도로 다시 확인 필요"
                                  : " · 다시 확인 필요"}
                            </Text>
                          ))}
                          {field.samples.map((sample, index) => (
                            <Text key={index} style={s.sub}>{sample.title}</Text>
                          ))}
                          <Button
                            label="이 분야 추가하고 책 보기"
                            onPress={() => void submit(undefined, undefined, field.id)}
                            disabled={busy}
                            secondary
                          />
                        </View>
                      ))}
                      {discovery.fields?.length ? (
                        <Text style={s.sub}>한국어와 영어 이름으로 같은 분야를 찾아요. 책 수집 후 진단 문제를 만들고 검토해요.</Text>
                      ) : (
                        <Text style={s.sub}>입력한 이름의 책을 찾았어요. 책을 모을 분류를 선택해 주세요.</Text>
                      )}
                      {discovery.groups.map((group) => (
                        <View key={group.category} style={styles.candidate}>
                          <Text style={s.cardTitle}>
                            {group.category
                              .replace(/^국내도서-/, "")
                              .replaceAll("-", " › ")}
                          </Text>
                          <Text style={s.sub}>
                            국내 책 {group.bookCount}권 확인 · 분류 기준 YES24
                          </Text>
                          {group.samples.map((sample, index) => (
                            <Text key={index} style={s.sub}>
                              {sample.title}
                            </Text>
                          ))}
                          <Button
                            label="이 분류의 책 모으기"
                            onPress={() =>
                              void submit(undefined, group.category)
                            }
                            disabled={busy}
                            secondary
                          />
                        </View>
                      ))}
                      {!!discovery.groups.length && (
                        <Text style={s.sub}>
                          해외 책은 대응하는 검색어와 분류를 확인할 수 있을 때 함께 모아요. 책 수집 후 진단 문제를 만들고 검토해요.
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )}
              {message && <Notice>{message}</Notice>}
              {existingId !== null &&
                topics.some((item) => item.id === existingId) && (
                  <Button
                    label="기존 분야 살펴보기"
                    onPress={() => {
                      const existing = topics.find(
                        (item) => item.id === existingId,
                      );
                      if (existing) {
                        selectTopic(existing);
                        router.replace("/");
                      }
                    }}
                    secondary
                  />
                )}
              {existingId !== null && (
                <CatalogRefresh
                  topicId={existingId}
                  slug={
                    topics.find((item) => item.id === existingId)?.mlTopicId ??
                    null
                  }
                  onUpdated={() => void refresh()}
                />
              )}
              <Button
                label={busy ? "확인 중" : "분야 확인"}
                onPress={() => void submit()}
                disabled={
                  busy ||
                  (discovery !== null &&
                    ["QUEUED", "SEARCHING"].includes(discovery.status))
                }
              />
            </Card>
            <Card>
              <View style={s.row}>
                <Text accessibilityRole="header" style={s.cardTitle}>
                  내 분야 요청
                </Text>
                <Button
                  label="내 요청 새로고침"
                  onPress={() => void reload()}
                  disabled={loading || busy}
                  secondary
                />
              </View>
              <Text style={s.sub}>
                준비 중인 요청은 자동으로 갱신돼요. 책이 준비되면 바로 살펴볼 수
                있어요.
              </Text>
              {loading && <Loading />}
              {listError && (
                <ErrorNotice message={listError} retry={() => void reload()} />
              )}
              {!loading && !listError && requests.length === 0 && (
                <Text style={s.sub}>아직 접수한 요청이 없어요.</Text>
              )}
              {requests.map((request) => (
                <View key={request.id} style={styles.request}>
                  <View style={s.row}>
                    <Text style={[s.cardTitle, styles.requestName]}>
                      {request.name}
                    </Text>
                    <Text style={s.badge}>{statusLabel[request.status]}</Text>
                  </View>
                  <Text style={s.sub}>
                    {request.categoryName ? `${request.categoryName} · ` : ""}
                    {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                  </Text>
                  {request.message && request.status !== "BOOKS_READY" && (
                    <Text style={s.body}>{request.message}</Text>
                  )}
                  {request.topicId !== null &&
                    topics.some((topic) => topic.id === request.topicId) && (
                      <Text style={s.sub}>
                        살펴볼 분야 ·{" "}
                        {
                          topics.find((topic) => topic.id === request.topicId)
                            ?.name
                        }
                      </Text>
                    )}
                  {["QUEUED", "CHECKING", "COLLECTING"].includes(
                    request.status,
                  ) && <Text style={s.sub}>분야 확인 → 책 수집 → 문제 생성·검토 → 진단 준비</Text>}
                  {request.status === "NEEDS_INPUT" && (
                    <AccountField
                      label="분야 이름 다시 입력"
                      value={correctedNames[request.id] ?? request.name}
                      onChangeText={(value) =>
                        setCorrectedNames((items) => ({
                          ...items,
                          [request.id]: value,
                        }))
                      }
                      placeholder="예: 컴퓨터 네트워크"
                      maxLength={120}
                      editable={retryingId !== request.id}
                    />
                  )}
                  {request.status === "NEEDS_INPUT" &&
                    correctedNames[request.id] === undefined &&
                    request.candidates.map((candidate) => (
                      <Button
                        key={candidate.slug}
                        label={`${candidate.name} 분야 선택`}
                        onPress={() => void retry(request, candidate.slug)}
                        disabled={retryingId !== null}
                        secondary
                      />
                    ))}
                  {["NEEDS_INPUT", "FAILED", "NEEDS_REVIEW"].includes(
                    request.status,
                  ) && (
                    <Button
                      label={
                        retryingId === request.id
                          ? "요청 중"
                          : request.status === "NEEDS_INPUT"
                            ? "이름 다시 확인"
                            : "준비 다시 시도"
                      }
                      onPress={() => void retry(request)}
                      disabled={retryingId !== null}
                      secondary
                    />
                  )}
                  {request.status === "BOOKS_READY" &&
                    request.topicId !== null && (
                      <Button
                        label={`준비된 책 ${request.bookCount}권 살펴보기`}
                        onPress={() => void openTopic(request.topicId!)}
                        secondary
                      />
                    )}
                  {request.status === "BOOKS_READY" &&
                    request.topicId !== null && (
                      <CatalogRefresh
                        topicId={request.topicId}
                        slug={
                          topics.find((item) => item.id === request.topicId)
                            ?.mlTopicId ?? null
                        }
                        onUpdated={() => {
                          void refresh();
                          void reload();
                        }}
                      />
                    )}
                  {request.content && (
                    <View style={styles.contentProgress}>
                      <Text style={s.fieldLabel}>
                        진단 준비 · {contentLabel[request.content.status]}
                      </Text>
                      {["QUEUED", "PREPARING"].includes(
                        request.content.status,
                      ) && (
                        <>
                          <Loading />
                          <Text style={s.sub}>
                            핵심 개념을 정리하고 책 목차와 연결하고 있어요.
                            완료되면 자동으로 갱신돼요.
                          </Text>
                        </>
                      )}
                      {request.content.conceptCount > 0 && (
                        <>
                          <Text style={s.body}>
                            책 {request.content.mappedBookCount}권에서 핵심 개념{" "}
                            {request.content.conceptCount}개를 찾았어요.
                          </Text>
                          <Text style={s.sub}>
                            {request.content.concepts
                              .map((c) => `${c.name} (${c.bookCount}권)`)
                              .join(" · ")}
                          </Text>
                        </>
                      )}
                      {request.content.status === "CONCEPTS_READY" && request.content.questions?.status !== "ACTIVE" && (
                        <Text style={s.sub}>
                          문제 {request.content.questionSpecCount}개의 학습
                          목표를 준비했어요. 문제 생성과 검토가 끝나면 진단을
                          사용할 수 있어요.
                        </Text>
                      )}
                      {request.content.questions && (
                        <>
                          <Text style={s.fieldLabel}>
                            문제 생성 ·{" "}
                            {request.content.questions.generatedCount}/
                            {request.content.questions.plannedCount}개
                          </Text>
                          {["QUEUED", "GENERATING"].includes(
                            request.content.questions.status,
                          ) && (
                            <>
                              <Loading />
                              <Text style={s.sub}>
                                문제를 만들고 저장하고 있어요. 중단돼도 저장된
                                문제부터 이어서 준비해요.
                              </Text>
                            </>
                          )}
                          {request.content.questions.status ===
                            "CANDIDATES_READY" && (
                            <Text style={s.body}>
                              문제 생성이 끝났어요. 정답과 학습 목표를 검토한 뒤
                              진단을 열어요.
                            </Text>
                          )}
                          {["REVIEWING", "REVIEW_PENDING"].includes(request.content.questions.status) && (
                            <><Loading /><Text style={s.body}>정답과 해설, 학습 목표를 검토하고 있어요.</Text></>
                          )}
                          {request.content.questions.status === "REVIEW_BLOCKED" && (
                            <Text style={s.body}>{request.content.questions.repairPending ? "검토 의견에 따라 문제를 보완하고 다시 확인해요." : "검토에서 보완할 내용이 발견됐어요. 진단은 아직 열리지 않았어요."}</Text>
                          )}
                          {request.content.questions.status === "ACTIVE" && (
                            <Text style={s.body}>문제 검토가 끝났어요. 책 둘러보기에서 맞춤 진단을 시작할 수 있어요.</Text>
                          )}
                          {request.content.questions.status === "FAILED" && (
                            <>
                              <Text style={s.sub}>
                                진단 준비가 중단됐어요. 저장된 문제는
                                보존됐어요.
                              </Text>
                              <Button
                                label={
                                  retryingId === request.id
                                    ? "요청 중"
                                    : "진단 준비 이어서 시도"
                                }
                                onPress={() => void retryContent(request, true)}
                                disabled={retryingId !== null}
                                secondary
                              />
                            </>
                          )}
                        </>
                      )}
                      {request.content.status === "NEEDS_EVIDENCE" && (
                        <Text style={s.sub}>
                          진단 문제를 준비하기에 목차 근거가 부족해요. 책은 먼저
                          살펴볼 수 있어요.
                        </Text>
                      )}
                      {request.content.status === "FAILED" && (
                        <>
                          <Text style={s.sub}>
                            개념 준비가 중단됐어요. 준비된 책은 계속 살펴볼 수
                            있어요.
                          </Text>
                          <Button
                            label={
                              retryingId === request.id
                                ? "요청 중"
                                : "개념 준비 다시 시도"
                            }
                            onPress={() => void retryContent(request)}
                            disabled={retryingId !== null}
                            secondary
                          />
                        </>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </Card>
          </>
        )}
      </View>
    </Page>
  );
}
const statusLabel: Record<TopicRequest["status"], string> = {
  NEEDS_REVIEW: "준비 대기",
  QUEUED: "준비 대기",
  CHECKING: "분야 확인 중",
  COLLECTING: "책 수집 중",
  NEEDS_INPUT: "추가 확인 필요",
  FAILED: "다시 시도 필요",
  BOOKS_READY: "책 준비 완료",
};
const contentLabel = {
  QUEUED: "개념 준비 대기",
  PREPARING: "개념 연결 중",
  CONCEPTS_READY: "문제 설계 완료",
  NEEDS_EVIDENCE: "목차 근거 보충 필요",
  FAILED: "다시 시도 필요",
};
const styles = StyleSheet.create({
  content: { maxWidth: 680, width: "100%", gap: 14 },
  candidate: { gap: 4 },
  request: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  requestName: { flexShrink: 1 },
  contentProgress: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
});
