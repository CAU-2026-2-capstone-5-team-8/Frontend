import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ConceptMap } from "../../components/ConceptMap";
import {
  Button,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  s,
  TopicPicker,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Graph } from "../../lib/types";
import { useLearning } from "../../state/LearningContext";
export default function MapScreen() {
  const { topic, profile } = useLearning();
  const [graph, setGraph] = useState<Graph | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!topic) return;
    let active = true;
    void api
      .graph(topic.id)
      .then((g) => {
        if (active) {
          setGraph(g);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [topic]);
  const measured = profile?.evidence.conceptProfile?.abilities.length || 0;
  return (
    <Page
      eyebrow="나의 개념 지도"
      title="나의 배움이 보이는 지도"
      description="뜻을 아는 것과 활용하는 능력을 나누어 살펴봐요."
    >
      <TopicPicker />
      {!profile && (
        <Notice>
          아직 완료한 진단이 없어요. 먼저 개념을 살펴보거나 진단을 시작할 수
          있습니다.
        </Notice>
      )}
      {profile && (
        <View style={s.row}>
          <Text style={s.badge}>문제로 평가한 개념·능력 {measured}개</Text>
          <Text style={s.sub}>자기평가는 별도 기록</Text>
        </View>
      )}
      {error ? (
        <ErrorNotice message={error} />
      ) : graph && graph.topicId === topic?.mlTopicId ? (
        <ConceptMap graph={graph} profile={profile?.evidence.conceptProfile} />
      ) : (
        <Loading />
      )}
      <Button
        label={profile ? "개념 다시 진단하기" : "개념 진단 시작"}
        disabled={!topic?.conceptAssessmentReady}
        onPress={() => router.push("/assessment")}
      />
    </Page>
  );
}
