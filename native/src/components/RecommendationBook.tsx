import { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { Book, RecommendationItem } from "../lib/types";
import { api } from "../lib/api";
import { nextChecks } from "../lib/learningRecommendations";
import { colors } from "../theme/tokens";
import { BookCover } from "./BookCover";
import { Button, s } from "./ui";

export function RecommendationBook({
  item,
  labels,
  onOpen,
}: {
  item: RecommendationItem;
  labels: Record<string, string>;
  onOpen: () => void;
}) {
  const wide = useWindowDimensions().width >= 800;
  const first = item.rank === 1;
  const [book, setBook] = useState<Book | null>(null);
  useEffect(() => {
    let active = true;
    void api
      .book(item.bookId)
      .then((value) => {
        if (active) setBook(value);
      })
      .catch(() => {
        /* Optional cover metadata never blocks the saved recommendation. */
      });
    return () => {
      active = false;
    };
  }, [item.bookId]);
  const needs = nextChecks(item.readingChecklist?.concepts || []);
  const summary = item.reviewOnly
    ? "배운 내용을 다시 꺼내 읽어보세요."
    : item.status === "foundation-gap"
      ? "기초 개념을 복습하며 함께 읽어보세요."
      : item.status === "ready-to-explore"
        ? "다음 학습으로 이어갈 책이에요."
        : "읽기 전에 익숙한 개념부터 확인해보세요.";
  return (
    <View
      style={[
        styles.row,
        first && styles.hero,
        first && wide && { flexDirection: "row-reverse" },
        first && !wide && styles.mobileHero,
      ]}
    >
      <View
        style={[
          styles.plate,
          first ? styles.heroPlate : styles.smallPlate,
          first && !wide && { flexGrow: 0, flexBasis: "auto" },
        ]}
      >
        <BookCover
          title={item.title}
          coverUrl={book?.coverUrl}
          width={first ? 165 : 95}
          height={first ? 235 : 135}
        />
      </View>
      <View
        style={[
          styles.copy,
          first && wide && styles.heroCopy,
          first && !wide && { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, first && styles.heroTitle]}
        >
          {item.title}
        </Text>
        {!!item.author && <Text style={s.sub}>{item.author}</Text>}
        <Text style={styles.summary}>{summary}</Text>
        {!!needs.length && (
          <Text style={s.sub}>
            함께 살펴볼 내용 ·{" "}
            {needs
              .slice(0, 3)
              .map((c) => labels[c.conceptId] || c.conceptId)
              .join(", ")}
          </Text>
        )}
        <View style={{ alignSelf: "flex-start", marginTop: 10 }}>
          <Button label="책 살펴보기" onPress={onOpen} secondary={!first} />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 24,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  hero: { gap: 36, paddingTop: 12, paddingBottom: 44 },
  mobileHero: { flexDirection: "column-reverse", alignItems: "stretch" },
  plate: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.soft,
  },
  heroPlate: { flexGrow: 1, flexBasis: 260, padding: 32, minHeight: 305 },
  smallPlate: { width: 115, height: 160 },
  copy: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, gap: 10 },
  heroCopy: { flexBasis: 280, flexGrow: 1, justifyContent: "center" },
  title: {
    fontSize: 20,
    lineHeight: 29,
    color: colors.ink,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  heroTitle: { fontSize: 30, lineHeight: 42, letterSpacing: -1 },
  summary: { ...s.body, marginTop: 8 },
});
