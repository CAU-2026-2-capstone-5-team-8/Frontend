import { Text, View } from "react-native";
import type { Book } from "../lib/types";
import { colors } from "../theme/tokens";
import { BookCover } from "./BookCover";
import { FocusPressable } from "./FocusPressable";

export function BookTile({
  book,
  width,
  onPress,
}: {
  book: Pick<Book, "title" | "author" | "coverUrl">;
  width: number;
  onPress: () => void;
}) {
  const coverWidth = Math.min(180, width);
  return (
    <FocusPressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title} 살펴보기`}
      onPress={onPress}
      style={({ pressed }) => ({ width, gap: 12, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <BookCover
          title={book.title}
          coverUrl={book.coverUrl}
          width={coverWidth}
          height={coverWidth * 1.42}
        />
      </View>
      <Text
        numberOfLines={3}
        style={{
          color: colors.ink,
          fontSize: 16,
          lineHeight: 24,
          fontWeight: "600",
        }}
      >
        {book.title}
      </Text>
      {book.author && (
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>
          {book.author}
        </Text>
      )}
    </FocusPressable>
  );
}
