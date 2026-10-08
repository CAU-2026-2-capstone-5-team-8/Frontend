import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { CatalogRefresh } from "../../components/CatalogRefresh";
import { BookTile } from "../../components/BookTile";
import {
  Button,
  colors,
  ErrorNotice,
  Loading,
  Page,
  s,
  TopicPicker,
} from "../../components/ui";
import { api } from "../../lib/api";
import { catalogLayout } from "../../lib/bookPresentation";
import type { BookPage } from "../../lib/types";
import { useAuth } from "../../state/AuthContext";
import { useLearning } from "../../state/LearningContext";
import { design } from "../../theme/tokens";

export default function Catalog() {
  const { session: login } = useAuth();
  const { topic, error, loading, refresh } = useLearning();
  const { width } = useWindowDimensions();
  const desktop = width >= design.desktopBreakpoint;
  const available =
    Math.min(width, design.contentMaxWidth) - (desktop ? 80 : 40);
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const { gap, tileWidth } = catalogLayout(gridWidth ?? available);
  const [bookResult, setBooks] = useState<{
    key: string;
    data: BookPage;
  } | null>(null);
  const [pageState, setPageState] = useState({ topic: 0, page: 0 });
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const page = pageState.topic === topic?.id ? pageState.page : 0;
  const catalogKey = `${topic?.id}:${page}`;
  const books = bookResult?.key === catalogKey ? bookResult.data : null;
  const failureMessage = failure?.key === catalogKey ? failure.message : null;
  useEffect(() => {
    if (!topic) return;
    let active = true;
    const key = `${topic.id}:${page}`;
    void Promise.resolve()
      .then(() => {
        if (!active) return null;
        setPending(true);
        setFailure(null);
        return api.books(topic.id, page);
      })
      .then((data) => {
        if (active && data) setBooks({ key, data });
      })
      .catch((e) => {
        if (active) setFailure({ key, message: e.message });
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [topic, page, revision]);
  const changePage = (next: number) =>
    setPageState({ topic: topic?.id || 0, page: next });
  return (
    <Page
      eyebrow="도서 탐색"
      title="책 둘러보기."
      description="궁금한 분야에서 다음으로 읽을 책을 찾아보세요."
    >
      <TopicPicker />
      {topic && (
        <CatalogRefresh
          key={topic.id}
          topicId={topic.id}
          slug={topic.mlTopicId}
          onUpdated={() => {
            setRevision((value) => value + 1);
            void refresh();
          }}
        />
      )}
      {error && <ErrorNotice message={error} retry={() => void refresh()} />}
      <View
        style={{
          backgroundColor: colors.soft,
          padding: desktop ? 32 : 24,
          gap: 20,
          flexDirection: desktop ? "row" : "column",
          alignItems: desktop ? "center" : "stretch",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 8, flex: desktop ? 1 : undefined }}>
          <Text style={s.cardTitle}>어떤 책부터 읽을지 고민이라면.</Text>
          <Text style={s.body}>
            짧은 개념 진단으로 나의 출발점을 찾아보세요.
          </Text>
        </View>
        <Button
          label={
            topic?.conceptAssessmentReady ? "맞는 책 찾기" : "맞춤 진단 준비 중"
          }
          disabled={!topic?.conceptAssessmentReady}
          onPress={() => router.push(login ? "/assessment" : "/account")}
        />
      </View>
      <View style={s.row}>
        <Text accessibilityRole="header" style={s.cardTitle}>
          {topic?.name || "도서 목록"}
        </Text>
        {books && <Text style={s.sub}>{books.totalElements}권</Text>}
      </View>
      {(loading || pending || (!!topic && !books && !failureMessage)) && (
        <Loading />
      )}
      {failureMessage && (
        <ErrorNotice
          message={failureMessage}
          retry={() => setRevision((value) => value + 1)}
        />
      )}
      {!pending && !failureMessage && books?.content.length === 0 && (
        <View style={{ gap: 10, paddingVertical: 24 }}>
          <Text style={s.cardTitle}>이 분야의 책을 준비하고 있어요.</Text>
          <Text style={s.body}>위에서 다른 분야를 선택해 보세요.</Text>
        </View>
      )}
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: "row", flexWrap: "wrap", gap, rowGap: 40 }}
      >
        {books?.content.map((book) => (
          <BookTile
            key={book.id}
            book={book}
            width={tileWidth}
            onPress={() => router.push(`/book/${book.id}`)}
          />
        ))}
      </View>
      {books && books.totalPages > 1 && (
        <View style={s.row}>
          <Button
            label="이전"
            secondary
            disabled={!page || pending}
            onPress={() => changePage(page - 1)}
          />
          <Text style={s.sub}>
            {page + 1} / {books.totalPages}
          </Text>
          <Button
            label="다음"
            secondary
            disabled={page + 1 >= books.totalPages || pending}
            onPress={() => changePage(page + 1)}
          />
        </View>
      )}
    </Page>
  );
}
