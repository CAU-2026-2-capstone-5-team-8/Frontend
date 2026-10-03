import { useAuth } from "../../state/AuthContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  colors,
  ErrorNotice,
  Loading,
  Page,
  s,
  TopicPicker,
} from "../../components/ui";
import { Icon } from "../../components/Icon";
import { api } from "../../lib/api";
import type { BookPage } from "../../lib/types";
import { useLearning } from "../../state/LearningContext";
export default function Catalog() {
  const { session: login } = useAuth();
  const { topic, error, loading, refresh } = useLearning();
  const [bookResult, setBooks] = useState<{
      key: string;
      data: BookPage;
    } | null>(null),
    [pageState, setPageState] = useState({ topic: 0, page: 0 }),
    [failure, setFailure] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const page = pageState.topic === topic?.id ? pageState.page : 0;
  const catalogKey = `${topic?.id}:${page}`;
  const books = bookResult?.key === catalogKey ? bookResult.data : null;
  const setPage = (update: (p: number) => number) => {
    setPending(true);
    setPageState({ topic: topic?.id || 0, page: update(page) });
  };
  useEffect(() => {
    if (!topic) return;
    let active = true;
    void api
      .books(topic.id, page)
      .then((r) => {
        if (active) {
          setBooks({ key: `${topic.id}:${page}`, data: r });
          setFailure(null);
        }
      })
      .catch((e) => {
        if (active) setFailure(e.message);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [topic, page]);
  return (
    <Page
      eyebrow="도서 탐색"
      title="지금의 나에게 맞는 책"
      description="분야를 고르고, 알고 있는 개념에서 다음 배움으로 이어가세요."
    >
      <TopicPicker />
      {(loading || pending || (!books && !failure)) && <Loading />}
      {error && <ErrorNotice message={error} retry={() => void refresh()} />}
      <Card>
        <View style={s.row}>
          <Text style={s.badge}>개념에서 시작하는 독서</Text>
          <Icon name="map" color={colors.green} size={26} />
        </View>
        <Text style={s.cardTitle}>어디까지 이해하고 있나요?</Text>
        <Text style={s.body}>
          개념별 문제와 자기평가로 현재 상태를 살펴보고, 책의 내용과 함께
          비교해요.
        </Text>
        <Button
          label={
            topic?.conceptAssessmentReady
              ? "나의 개념 진단하기"
              : "이 분야는 진단 준비 중"
          }
          disabled={!!login && !topic?.conceptAssessmentReady}
          onPress={() => router.push(login ? "/assessment" : "/account")}
        />
      </Card>
      {failure && <ErrorNotice message={failure} />}
      <View style={s.row}>
        <Text style={s.cardTitle}>{topic?.name || "도서 목록"}</Text>
        <Text style={s.sub}>{books?.totalElements || 0}권</Text>
      </View>
      <View style={s.grid}>
        {books?.content.map((book) => (
          <Card
            key={book.id}
            onPress={() => router.push(`/book/${book.id}`)}
            accessibilityLabel={`${book.title} 내용과 개념 살펴보기`}
            style={{ flexGrow: 1, flexBasis: 260 }}
          >
            <View style={s.row}>
              <View
                style={{
                  width: 46,
                  height: 54,
                  borderRadius: 13,
                  backgroundColor: colors.unknown,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="book" size={26} color={colors.green} />
              </View>
              <Text style={s.badge}>
                {book.topics.find((t) => t.id === topic?.id)?.tocEntryCount
                  ? "목차 확보"
                  : "목차 확인 중"}
              </Text>
            </View>
            <Text style={s.cardTitle}>{book.title}</Text>
            <Text style={s.sub}>{book.author || "저자 정보 확인 중"}</Text>
            <View style={s.divider} />
            <View style={s.row}>
              <Text style={[s.sub, { color: colors.green }]}>
                내용과 개념 살펴보기
              </Text>
              <Icon name="arrow" size={17} color={colors.green} />
            </View>
          </Card>
        ))}
      </View>
      {books && (
        <View style={s.row}>
          <Button
            label="이전"
            secondary
            disabled={!page || pending}
            onPress={() => setPage((p) => p - 1)}
          />
          <Text style={s.sub}>
            {page + 1} / {Math.max(1, books.totalPages)}
          </Text>
          <Button
            label="다음"
            secondary
            disabled={page + 1 >= books.totalPages || pending}
            onPress={() => setPage((p) => p + 1)}
          />
        </View>
      )}
    </Page>
  );
}
