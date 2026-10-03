import { useAuth } from "../../state/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { PublicBookReviews } from "../../components/PublicBookReviews";
import { ConceptMap } from "../../components/ConceptMap";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  s,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Book, Graph } from "../../lib/types";
import { useLearning } from "../../state/LearningContext";
export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { topic } = useLearning();
  return <BookDetail key={`${id}:${topic?.id}`} id={Number(id)} />;
}
function BookDetail({ id }: { id: number }) {
  const { session: login } = useAuth();
  const [adding, setAdding] = useState(false);
  const [shelfError, setShelfError] = useState<string | null>(null);
  async function addToShelf() {
    if (!login) {
      router.push("/account");
      return;
    }
    if (adding) return;
    setAdding(true);
    setShelfError(null);
    try {
      await api.addToShelf(id);
      router.push("/shelf");
    } catch (e) {
      setShelfError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }
  const { topic, profile, topics, selectTopic } = useLearning();
  const [book, setBook] = useState<Book | null>(null),
    [graph, setGraph] = useState<Graph | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void api
      .book(Number(id))
      .then((b) => {
        if (active) {
          const belongs = b.topics.some((t) => t.id === topic?.id);
          const actualTopic = topics.find((t) =>
            b.topics.some((bt) => bt.id === t.id),
          );
          if (!belongs && actualTopic) selectTopic(actualTopic);
          else setBook(b);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (topic)
      void api
        .graph(topic.id, Number(id))
        .then((g) => {
          if (active) setGraph(g);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [id, topic, topics, selectTopic]);
  return (
    <Page
      eyebrow="책과 나의 개념"
      title={book?.title || "책을 살펴보고 있어요"}
      description={book?.author || undefined}
    >
      {error && <ErrorNotice message={error} />} {!book && <Loading />}
      {book && (
        <Card>
          <Text style={s.cardTitle}>이 책을 내 서재에</Text>
          <Text style={s.sub}>
            읽기 상태와 개인 메모를 남기고, 한줄평을 공유해요. 이미 담은 책의
            기록은 유지됩니다.
          </Text>
          {shelfError && <ErrorNotice message={shelfError} />}
          <Button
            label={login ? "내 서재에 담기" : "로그인하고 책 담기"}
            disabled={adding}
            onPress={() => void addToShelf()}
          />
        </Card>
      )}
      {book?.description && (
        <Card>
          <Text style={s.cardTitle}>이 책에 대하여</Text>
          <Text style={s.body}>{book.description}</Text>
        </Card>
      )}
      {graph?.book && !graph.book.available && (
        <Notice>
          이 책은 아직 공통 개념과 연결된 분석 자료가 없어요. 미확인을 개념
          부재로 판단하지 않습니다.
        </Notice>
      )}
      {graph?.book?.available && graph.book.coveredConcepts.length === 0 && (
        <Notice>
          목차 분석은 되어 있지만 아직 공통 개념과 연결된 내용이 없어요. 다루는
          개념이 없다는 뜻은 아닙니다.
        </Notice>
      )}
      {graph?.book?.available && (
        <View style={s.row}>
          <Text style={s.cardTitle}>책과 나의 개념 비교</Text>
          <Text style={s.badge}>
            확인된 개념 {graph.book.coveredConcepts.length}개
          </Text>
        </View>
      )}
      {graph && (
        <ConceptMap graph={graph} profile={profile?.evidence.conceptProfile} />
      )}
      <Text style={s.sub}>
        테두리는 수집 근거에서 연결된 책의 개념입니다. 목차에 없는 개념을 다루지
        않는다고 단정할 수 없으며, 설명 깊이는 미확인입니다.
      </Text>
      <Button
        label={profile ? "나에게 추천된 책 보기" : "먼저 개념 진단하기"}
        disabled={!profile && !topic?.conceptAssessmentReady}
        onPress={() =>
          router.push(
            !login ? "/account" : profile ? "/recommendations" : "/assessment",
          )
        }
      />
      {book && <PublicBookReviews bookId={book.id} />}
      <Button
        label="책 목록으로 돌아가기"
        secondary
        onPress={() => router.replace("/")}
      />
    </Page>
  );
}
