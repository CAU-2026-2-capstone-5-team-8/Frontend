import { useState } from "react";
import { Image, Text, View } from "react-native";
import { safeCoverUrl } from "../lib/bookPresentation";
import { colors } from "../theme/tokens";
import { Icon } from "./Icon";

export function BookCover({
  title,
  coverUrl,
  width = 150,
  height = 212,
}: {
  title: string;
  coverUrl?: string | null;
  width?: number;
  height?: number;
}) {
  const uri = safeCoverUrl(coverUrl);
  const [failed, setFailed] = useState<string | null>(null);
  return uri && failed !== uri ? (
    <Image
      source={{ uri }}
      accessibilityLabel={`${title} 표지`}
      resizeMode="contain"
      style={{ width, height }}
      onError={() => setFailed(uri)}
    />
  ) : (
    <View
      accessibilityLabel={`${title}, 표지 없음`}
      style={{
        width,
        height,
        backgroundColor: colors.unknown,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <Icon name="book" size={30} color={colors.muted} />
      <Text style={{ color: colors.muted, fontSize: 11 }}>표지 없음</Text>
    </View>
  );
}
