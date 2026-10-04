import { router, useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ShelfEditor } from "../components/ShelfEditor";
import { BookCover } from "../components/BookCover";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  SegmentedControl,
  s,
} from "../components/ui";
import { api } from "../lib/api";
import {
  readingOptions,
  type LibraryPage,
  type ReadingStatus,
  type ShelfEntry,
} from "../lib/libraryApi";
import { useAuth } from "../state/AuthContext";

export default function Shelf() {
  const { session } = useAuth();
  return (
    <Page
      eyebrow="내 서재"
      title="책과 함께 쌓는 기록"
      description="읽고 싶은 책을 모으고, 읽는 동안 떠오른 생각을 남겨요."
    >
      {session ? (
        <MyShelf />
      ) : (
        <Card>
          <Text style={s.cardTitle}>내 서재를 시작해 보세요</Text>
          <Text style={s.body}>
            로그인하면 책과 개인 메모를 내 계정에 보관할 수 있어요.
          </Text>
          <Button
            label="로그인하고 서재 이용하기"
            onPress={() => router.push("/account")}
          />
        </Card>
      )}
    </Page>
  );
}
function MyShelf() {
  const [filter, setFilter] = useState<ReadingStatus | "ALL">("ALL");
  const [page, setPage] = useState(0),
    [reload, setReload] = useState(0);
  const [data, setData] = useState<LibraryPage<ShelfEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShelfEntry | null>(null);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setData(null);
      setError(null);
      try {
        const result = await api.shelf(
          page,
          filter === "ALL" ? undefined : filter,
        );
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
  }, [focused, page, filter, reload]);
  return (
    <>
      {selected && (
        <ShelfEditor
          key={selected.bookId}
          entry={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setPage(0);
            setReload((n) => n + 1);
          }}
        />
      )}
      <SegmentedControl
        options={[{ value: "ALL", label: "전체" }, ...readingOptions]}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(0);
        }}
      />
      {error ? (
        <ErrorNotice message={error} retry={() => setReload((n) => n + 1)} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Text style={s.sub}>
            {filter === "ALL"
              ? "내 서재"
              : readingOptions.find((o) => o.value === filter)?.label}{" "}
            · {data.totalElements}권
          </Text>
          {data.content.length === 0 && (
            <Notice>
              {filter === "ALL"
                ? "아직 담은 책이 없어요. 책 상세에서 ‘내 서재에 담기’를 눌러 시작해 보세요."
                : "이 읽기 상태로 저장한 책이 없어요."}
            </Notice>
          )}
          {data.content.map((entry) => (
            <Card key={entry.bookId}>
              <View
                style={{ flexDirection: "row", gap: 24, alignItems: "center" }}
              >
                <BookCover
                  title={entry.title}
                  coverUrl={entry.coverUrl}
                  width={82}
                  height={116}
                />
                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={s.badge}>
                    {
                      readingOptions.find((o) => o.value === entry.status)
                        ?.label
                    }
                  </Text>
                  <Text style={s.cardTitle}>{entry.title}</Text>
                  <Text style={s.sub}>{entry.author}</Text>
                </View>
              </View>
              {entry.note !== "" && (
                <View style={{ gap: 6 }}>
                  <Text style={s.fieldLabel}>나만 보는 메모</Text>
                  <Text style={s.body}>{entry.note}</Text>
                </View>
              )}
              {entry.review && (
                <Text style={s.sub}>공개 한줄평을 남겼어요.</Text>
              )}
              <Button
                label={`${entry.title} 기록 편집`}
                secondary
                disabled={selected !== null}
                onPress={() => setSelected(entry)}
              />
              <Button
                label="책 상세와 후기 보기"
                secondary
                onPress={() => router.push(`/book/${entry.bookId}`)}
              />
            </Card>
          ))}
          {data.totalPages > 1 && (
            <View style={s.row}>
              <Button
                label="이전 책"
                secondary
                disabled={page === 0}
                onPress={() => setPage((p) => p - 1)}
              />
              <Text style={s.sub}>
                {page + 1} / {data.totalPages}
              </Text>
              <Button
                label="다음 책"
                secondary
                disabled={page + 1 >= data.totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          )}
        </>
      )}
      <Button
        label="담을 책 찾아보기"
        secondary
        onPress={() => router.push("/")}
      />
    </>
  );
}
