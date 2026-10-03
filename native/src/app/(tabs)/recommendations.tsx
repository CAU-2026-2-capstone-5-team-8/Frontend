import { authSession } from "../../lib/authSession";
import { useAuth } from "../../state/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  ErrorNotice,
  Notice,
  Page,
  s,
  SegmentedControl,
  TopicPicker,
} from "../../components/ui";
import { api } from "../../lib/api";
import { abilityLabels } from "../../lib/learning";
import type { Ability } from "../../lib/types";
import { useLearning } from "../../state/LearningContext";

const statusLabels = {
  "ready-to-explore": "다음 배움 후보",
  "check-first": "선수개념 먼저 확인",
  "foundation-gap": "기초 연습 후 살펴보기",
};

export default function Recommendations() {
  const { session: login } = useAuth();
  const { topic, profile, recommendation, saveRecommendation, storageKey } =
    useLearning();
  const [focus, setFocus] = useState<Ability | null>(null);
  const ability = focus || recommendation?.ability || "application";
  const result = recommendation?.ability === ability ? recommendation : null;
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);
  const key = useRef<{ scope: string; value: string } | null>(null);
  const currentScope = useRef("");
  useEffect(() => {
    currentScope.current = `${topic?.id}:${profile?.id}:${ability}`;
  }, [topic?.id, profile?.id, ability]);

  async function recommend() {
    if (!topic || !profile) return;
    const scope = currentScope.current;
    const loginSnapshot = authSession.getSnapshot();
    setPending(true);
    setError(null);
    try {
      const requestStorage = storageKey(
        topic.id,
        `learningRequest:${profile.id}:${ability}`,
      );
      if (key.current?.scope !== scope) {
        const savedKey = await AsyncStorage.getItem(requestStorage);
        key.current = {
          scope,
          value:
            savedKey ||
            `rn-learning-${profile.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        };
        await AsyncStorage.setItem(requestStorage, key.current.value);
      }
      if (authSession.getSnapshot() !== loginSnapshot) return;
      const received = result
        ? await api.recommendation(result.id)
        : await api.recommend(topic.id, profile.id, ability, key.current.value);
      if (currentScope.current === scope) await saveRecommendation(received);
    } catch (e) {
      if (currentScope.current === scope) setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Page
      eyebrow="맞춤 추천"
      title="다음 배움으로 이어지는 책"
      description="어떤 능력을 더 키우고 싶은지 고르면, 선수개념과 배울 내용을 함께 비교해요."
    >
      <TopicPicker />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>더 키우고 싶은 능력</Text>
        <SegmentedControl
          options={(Object.keys(abilityLabels) as Ability[]).map((value) => ({
            value,
            label: abilityLabels[value],
          }))}
          value={ability}
          disabled={pending}
          onChange={(value) => {
            setFocus(value);
            setError(null);
          }}
        />
      </View>
      {!profile ? (
        <>
          <Notice>개념 진단을 마치면 책과 나의 상태를 비교할 수 있어요.</Notice>
          <Button
            label={login ? "개념 진단 시작" : "로그인하고 진단하기"}
            disabled={!!login && !topic?.conceptAssessmentReady}
            onPress={() => router.push(login ? "/assessment" : "/account")}
          />
        </>
      ) : (
        <Button
          label={
            pending
              ? "책을 비교하고 있어요…"
              : result
                ? "같은 조건으로 추천 확인"
                : "이 능력으로 책 추천받기"
          }
          disabled={pending}
          onPress={() => void recommend()}
        />
      )}
      {result && result.conceptProfileVersion !== "concept-abilities-v2" && (
        <Notice>
          이전 추천은 설명 제공 여부를 구분하기 전의 결과입니다. 새 진단 후
          추천을 다시 받으면 사전 지식 기준으로 비교합니다.
        </Notice>
      )}
      {error && <ErrorNotice message={error} retry={() => void recommend()} />}
      {result && (
        <Text style={s.sub}>
          분석한 {result.candidateCount}권 중 개념이 연결된{" "}
          {result.mappedCandidateCount}권을 비교했어요. 미연결{" "}
          {result.unmappedCandidateCount}권은 판단을 보류합니다.
        </Text>
      )}
      {result?.items.length === 0 && (
        <Notice>
          공통 개념과 연결된 추천 후보가 아직 없어요. 책 목록에서 자료 확보
          상태를 확인할 수 있습니다.
        </Notice>
      )}
      {result?.items.map((item) => (
        <Card key={item.bookId}>
          <View style={s.row}>
            <Text style={s.badge}>
              {item.reviewOnly ? "복습 후보" : statusLabels[item.status]}
            </Text>
            <Text style={s.sub}>{item.rank}</Text>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.sub}>{item.author}</Text>
          <View style={s.row}>
            <Text style={s.body}>선수개념 후보 정답 확인</Text>
            <Text style={s.body}>
              {item.foundationStatus === "not-established"
                ? "판단 보류"
                : `${item.foundation.filter((c) => c.state === "correct").length} / ${item.foundation.length}`}
            </Text>
          </View>
          <View style={s.row}>
            <Text style={s.body}>책에서 더 연습할 개념</Text>
            <Text style={s.body}>{item.practiceConceptCount}개</Text>
          </View>
          <View style={s.row}>
            <Text style={s.body}>책 내용 중 미평가 개념</Text>
            <Text style={s.body}>{item.unmeasuredConceptCount}개</Text>
          </View>
          {item.reasons.map((reason, i) => (
            <Text key={i} style={s.sub}>
              {reason}
            </Text>
          ))}
          <Button
            label="책과 내 개념 지도 비교"
            secondary
            onPress={() => router.push(`/book/${item.bookId}`)}
          />
        </Card>
      ))}
      {result && (
        <Text style={s.sub}>
          문제로 확인한 개념·능력을 기준으로 한 실험적 추천이에요. 자기평가는
          정답 확인에 포함하지 않습니다. 미평가 개념은 추가 확인이 필요하며,
          목차로 책의 설명 깊이를 판단하지 않습니다.
        </Text>
      )}
    </Page>
  );
}
