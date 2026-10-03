import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import {
  difficultyOptions,
  type LibraryPage,
  type PublicReview,
} from "../lib/libraryApi";
import { Button, Card, ErrorNotice, Loading, s } from "./ui";

export function PublicBookReviews({ bookId }: { bookId: number }) {
  const [page, setPage] = useState(0),
    [reload, setReload] = useState(0);
  const [data, setData] = useState<LibraryPage<PublicReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setData(null);
      setError(null);
      try {
        const result = await api.bookReviews(bookId, page);
        if (active) {
          if (page > 0 && result.content.length === 0)
            setPage(Math.max(0, result.totalPages - 1));
          else setData(result);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    return () => {
      active = false;
    };
  }, [focused, bookId, page, reload]);
  return (
    <Card>
      <Text style={s.cardTitle}>독자들의 한줄평</Text>
      <Text style={s.sub}>
        체감 난이도는 독자의 경험이에요. 책의 분석 난이도나 추천 점수는 바꾸지
        않습니다.
      </Text>
      {error ? (
        <ErrorNotice message={error} retry={() => setReload((n) => n + 1)} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Text style={s.sub}>공개 후기 {data.totalElements}개</Text>
          {data.content.length === 0 && (
            <Text style={s.body}>아직 등록된 후기가 없어요.</Text>
          )}
          {data.content.map((review) => (
            <View
              key={`${review.authorLabel}:${review.updatedAt}`}
              style={{ gap: 8 }}
            >
              <View style={s.row}>
                <Text style={s.body}>{review.authorLabel}</Text>
                <Text style={s.badge}>
                  {
                    difficultyOptions.find((o) => o.value === review.difficulty)
                      ?.label
                  }
                </Text>
              </View>
              <Text style={s.body}>{review.text}</Text>
              <View style={s.divider} />
            </View>
          ))}
          {data.totalPages > 1 && (
            <View style={s.row}>
              <Button
                label="이전 후기"
                secondary
                disabled={page === 0}
                onPress={() => setPage((p) => p - 1)}
              />
              <Text style={s.sub}>
                {page + 1} / {data.totalPages}
              </Text>
              <Button
                label="다음 후기"
                secondary
                disabled={page + 1 >= data.totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          )}
        </>
      )}
    </Card>
  );
}
