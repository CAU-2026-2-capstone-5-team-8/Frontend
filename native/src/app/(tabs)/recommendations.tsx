import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RecommendationBook } from "../../components/RecommendationBook";
import { FocusPressable } from "../../components/FocusPressable";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Page,
  s,
  SegmentedControl,
  TopicPicker,
} from "../../components/ui";
import { api } from "../../lib/api";
import { authSession } from "../../lib/authSession";
import { abilityLabels } from "../../lib/learning";
import {
  currentRecommendation,
  learningModel,
  requestKind,
  supportsLearningProfile,
} from "../../lib/learningRecommendations";
import type { Ability } from "../../lib/types";
import { useAuth } from "../../state/AuthContext";
import { useLearning } from "../../state/LearningContext";
import { colors } from "../../theme/tokens";

export default function Recommendations() {
  const { session } = useAuth();
  const { topic, profile, recommendation, loading, error, refresh } =
    useLearning();
  const [focus, setFocus] = useState<Ability | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ability = focus || recommendation?.ability || "application";
  const hasResult = !!currentRecommendation(
    recommendation,
    session?.userId,
    topic?.id,
    profile?.id,
    ability,
  );
  return (
    <Page
      eyebrow="맞춤 추천"
      title="다음으로 읽을 책."
      description="지금 알고 있는 것에서, 다음 배움으로."
    >
      <View style={{ gap: 18 }}>
        {hasResult && (
          <View style={s.row}>
            <View style={{ gap: 3 }}>
              <Text style={s.body}>
                {topic?.name} · {abilityLabels[ability]}
              </Text>
            </View>
            <FocusPressable
              accessibilityRole="button"
              accessibilityState={{ expanded: settingsOpen }}
              onPress={() => setSettingsOpen(!settingsOpen)}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>
                {settingsOpen ? "조건 접기" : "조건 변경"}
              </Text>
            </FocusPressable>
          </View>
        )}
        {(!hasResult || settingsOpen) && (
          <View style={styles.controls}>
            <View style={styles.control}>
              <TopicPicker />
            </View>
            <View style={[styles.control, { gap: 10 }]}>
              <Text style={s.fieldLabel}>이번에 키우고 싶은 능력</Text>
              <SegmentedControl
                options={(Object.keys(abilityLabels) as Ability[]).map(
                  (value) => ({ value, label: abilityLabels[value] }),
                )}
                value={ability}
                onChange={setFocus}
              />
            </View>
          </View>
        )}
      </View>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNotice message={error} retry={() => void refresh()} />
      ) : (
        <RecommendationResults
          key={`${session?.userId}:${topic?.id}:${profile?.id}:${ability}`}
          ability={ability}
          showRefresh={settingsOpen}
        />
      )}
    </Page>
  );
}

function RecommendationResults({
  ability,
  showRefresh,
}: {
  ability: Ability;
  showRefresh: boolean;
}) {
  const { session: login } = useAuth();
  const { topic, profile, recommendation, saveRecommendation, storageKey } =
    useLearning();
  const result = currentRecommendation(
    recommendation,
    login?.userId,
    topic?.id,
    profile?.id,
    ability,
  );
  const modern = result?.modelVersion === learningModel;
  const supportedProfile = supportsLearningProfile(profile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const active = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    active.current = true;
    if (topic)
      void api
        .graph(topic.id)
        .then((g) => {
          if (active.current)
            setLabels(Object.fromEntries(g.nodes.map((n) => [n.id, n.label])));
        })
        .catch(() => {
          /* Raw concept IDs remain readable if labels are unavailable. */
        });
    return () => {
      active.current = false;
    };
  }, [topic]);

  async function recommend() {
    if (!topic || !profile || busy.current) return;
    if (!modern && !supportedProfile) return;
    busy.current = true;
    const loginSnapshot = authSession.getSnapshot();
    setPending(true);
    setError(null);
    try {
      let received;
      if (modern && result) received = await api.recommendation(result.id);
      else {
        const location = storageKey(topic.id, requestKind(profile.id, ability));
        let key = await AsyncStorage.getItem(location);
        if (!key) {
          key = `rn-learning-v2-${profile.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          await AsyncStorage.setItem(location, key);
        }
        if (!active.current || authSession.getSnapshot() !== loginSnapshot)
          return;
        received = await api.recommend(topic.id, profile.id, ability, key);
      }
      if (active.current && authSession.getSnapshot() === loginSnapshot)
        await saveRecommendation(received);
    } catch (e) {
      if (active.current) setError((e as Error).message);
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  }

  return (
    <>
      {!profile ? (
        <Card>
          <Text style={s.cardTitle}>나에게 맞는 책을 찾아볼까요?</Text>
          <Text style={s.body}>
            관심 분야의 문제를 풀고, 다음으로 읽을 책을 만나보세요.
          </Text>
          <Button
            label={login ? "개념 진단 시작" : "로그인하고 진단하기"}
            disabled={!!login && !topic?.conceptAssessmentReady}
            onPress={() => router.push(login ? "/assessment" : "/account")}
          />
        </Card>
      ) : !modern && !supportedProfile ? (
        <Card>
          <Text style={s.cardTitle}>새 추천을 받아보세요</Text>
          <Text style={s.body}>
            개념 진단을 다시 받으면 지금의 나에게 맞는 책을 찾아드려요.
          </Text>
          <Button
            label="개념 진단 다시 받기"
            disabled={!topic?.conceptAssessmentReady}
            onPress={() => router.push("/assessment")}
          />
        </Card>
      ) : modern ? (
        showRefresh ? (
          <FocusPressable
            accessibilityRole="button"
            disabled={pending}
            accessibilityState={{ disabled: pending }}
            onPress={() => void recommend()}
            style={[styles.textButton, { alignSelf: "flex-end" }]}
          >
            <Text style={styles.textButtonLabel}>
              {pending ? "불러오는 중…" : "새로고침"}
            </Text>
          </FocusPressable>
        ) : null
      ) : (
        <Button
          label={
            pending
              ? "책을 찾고 있어요…"
              : result
                ? "새 추천 받기"
                : "나에게 맞는 책 찾기"
          }
          disabled={pending}
          onPress={() => void recommend()}
        />
      )}
      {error && <ErrorNotice message={error} retry={() => void recommend()} />}
      {result && (
        <>
          {result.items.length === 0 && (
            <View style={styles.empty}>
              <Text style={s.cardTitle}>이 분야의 책을 직접 둘러볼까요?</Text>
              <Text style={s.body}>
                지금 추천할 책을 찾지 못했어요. 다른 분야를 선택하거나 책 목록을
                살펴보세요.
              </Text>
              <Button
                label="책 둘러보기"
                secondary
                onPress={() => router.push("/")}
              />
            </View>
          )}
          {result.items.map((item) => (
            <RecommendationBook
              key={item.bookId}
              item={item}
              labels={labels}
              onOpen={() => router.push(`/book/${item.bookId}`)}
            />
          ))}
        </>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  control: { flex: 1, minWidth: 210 },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  textButtonLabel: { ...s.sub, color: colors.green, fontWeight: "600" },
  empty: { gap: 18, paddingVertical: 44, alignItems: "flex-start" },
});
