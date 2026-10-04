import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BookCover } from "../../components/BookCover";
import { PublicBookReviews } from "../../components/PublicBookReviews";
import { ReadingChecklist } from "../../components/ReadingChecklist";
import { Button, ErrorNotice, Loading, Page, s } from "../../components/ui";
import { api } from "../../lib/api";
import { authSession } from "../../lib/authSession";
import {
  currentRecommendation,
  learningModel,
} from "../../lib/learningRecommendations";
import type { Book, Graph } from "../../lib/types";
import { useAuth } from "../../state/AuthContext";
import { useLearning } from "../../state/LearningContext";
import { colors } from "../../theme/tokens";

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { topic } = useLearning();
  const { session } = useAuth();
  return (
    <BookDetail key={`${id}:${topic?.id}:${session?.userId}`} id={Number(id)} />
  );
}

function BookDetail({ id }: { id: number }) {
  const { session: login } = useAuth();
  const { topic, profile, topics, selectTopic, recommendation } = useLearning();
  const wide = useWindowDimensions().width >= 800;
  const [adding, setAdding] = useState(false);
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const busy = useRef(false);
  const saved = currentRecommendation(
    recommendation,
    login?.userId,
    topic?.id,
    profile?.id,
    recommendation?.ability || "application",
  );
  const prepared = saved?.items.find((item) => item.bookId === id);
  const checklist =
    saved?.modelVersion === learningModel
      ? prepared?.readingChecklist
      : undefined;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void api
      .book(id)
      .then((b) => {
        if (!current) return;
        const belongs = b.topics.some((t) => t.id === topic?.id);
        const actualTopic = topics.find((t) =>
          b.topics.some((bt) => bt.id === t.id),
        );
        if (!belongs && actualTopic) selectTopic(actualTopic);
        else {
          setBook(b);
          setError(null);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    if (topic)
      void api
        .graph(topic.id, id)
        .then((g) => {
          if (current) setGraph(g);
        })
        .catch(() => {
          /* Catalog content remains available without optional concept labels. */
        });
    return () => {
      current = false;
    };
  }, [id, topic, topics, selectTopic, retry]);

  async function addToShelf() {
    if (!login) {
      router.push("/account");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const snapshot = authSession.getSnapshot();
    setAdding(true);
    setShelfError(null);
    try {
      await api.addToShelf(id);
      if (active.current && authSession.getSnapshot() === snapshot)
        router.push("/shelf");
    } catch (e) {
      if (active.current && authSession.getSnapshot() === snapshot)
        setShelfError((e as Error).message);
    } finally {
      busy.current = false;
      if (active.current) setAdding(false);
    }
  }

  return (
    <Page
      eyebrow="책 살펴보기"
      title={book?.title || "책 살펴보기"}
      description={book?.author || undefined}
    >
      {error && (
        <ErrorNotice
          message={error}
          retry={() => {
            setError(null);
            setRetry((value) => value + 1);
          }}
        />
      )}
      {!book && !error && <Loading />}
      {book && (
        <>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.plate}>
              <BookCover
                title={book.title}
                coverUrl={book.coverUrl}
                width={165}
                height={235}
              />
            </View>
            <View style={styles.overview}>
              {!!book.description && (
                <>
                  <Text accessibilityRole="header" style={s.cardTitle}>
                    이 책에 대하여
                  </Text>
                  <Text style={styles.description}>{book.description}</Text>
                </>
              )}
              <View style={styles.actions}>
                <Button
                  label={
                    adding
                      ? "담는 중…"
                      : login
                        ? "내 서재에 담기"
                        : "로그인하고 책 담기"
                  }
                  disabled={adding}
                  onPress={() => void addToShelf()}
                />
                <Text style={s.sub}>
                  내 서재에서 읽기 기록과 메모를 남길 수 있어요.
                </Text>
              </View>
              {shelfError && <ErrorNotice message={shelfError} />}
            </View>
          </View>
          {checklist && saved ? (
            <View style={styles.section}>
              <ReadingChecklist
                key={`${saved.id}:${id}`}
                checklist={checklist}
                labels={Object.fromEntries(
                  (graph?.nodes || []).map((n) => [n.id, n.label]),
                )}
              />
              <View style={styles.actions}>
                <Button
                  label="개념 진단 다시 받기"
                  secondary
                  disabled={!topic?.conceptAssessmentReady}
                  onPress={() => router.push("/assessment")}
                />
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={s.cardTitle}>
                다음으로 읽을 책을 찾고 있나요?
              </Text>
              <Text style={s.body}>
                알고 있는 개념을 확인하고, 나에게 맞는 책을 찾아보세요.
              </Text>
              <View style={styles.actions}>
                <Button
                  label={profile ? "맞춤 추천 보기" : "개념 진단 시작"}
                  secondary
                  disabled={
                    !!login && !profile && !topic?.conceptAssessmentReady
                  }
                  onPress={() =>
                    router.push(
                      !login
                        ? "/account"
                        : profile
                          ? "/recommendations"
                          : "/assessment",
                    )
                  }
                />
              </View>
            </View>
          )}
          <PublicBookReviews bookId={book.id} />
        </>
      )}
      <View style={styles.actions}>
        <Button
          label="책 목록으로 돌아가기"
          secondary
          onPress={() => router.replace("/")}
        />
      </View>
    </Page>
  );
}
const styles = StyleSheet.create({
  hero: { gap: 28, paddingBottom: 32 },
  heroWide: { flexDirection: "row", alignItems: "flex-start", gap: 48 },
  plate: {
    padding: 36,
    minHeight: 307,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  overview: { flex: 1, minWidth: 0, gap: 20 },
  description: { ...s.body, lineHeight: 27 },
  actions: { alignItems: "flex-start", gap: 12 },
  section: {
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingVertical: 28,
    gap: 22,
  },
});
