import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLearning } from "../state/LearningContext";
import { colors, design } from "../theme/tokens";
import { AppearanceToggle, Backdrop, Brand } from "./AppShell";
import { GlassSurface } from "./GlassSurface";
import { Icon } from "./Icon";
import { FocusPressable as Pressable } from "./FocusPressable";
export { colors } from "../theme/tokens";

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <GlassSurface
      style={style}
      contentStyle={s.cardContent}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GlassSurface>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : s.primary,
        disabled && { opacity: 0.46 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {!secondary && (
        <LinearGradient
          pointerEvents="none"
          colors={["#287C67", "#176351"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text
        style={[s.buttonText, { color: secondary ? colors.ink : colors.paper }]}
      >
        {label}
      </Text>
      {!secondary && <Icon name="arrow" size={18} color={colors.paper} />}
    </Pressable>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.notice}>
      <Icon name="info" size={18} color={colors.green} />
      <Text style={[s.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={s.error}>
      <View style={s.noticeRow}>
        <Icon name="info" size={20} color={colors.danger} />
        <Text style={[s.body, { color: colors.danger, flex: 1 }]}>
          {message}
        </Text>
      </View>
      {retry && <Button label="다시 시도" onPress={retry} secondary />}
    </View>
  );
}

export function Page({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const desktop = width >= design.desktopBreakpoint;
  const { topic } = useLearning();
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={[
          s.page,
          {
            paddingHorizontal: desktop ? 40 : 20,
            paddingBottom: desktop ? 48 : 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.chrome}>
          {desktop ? (
            <Text style={s.breadcrumb}>
              나의 학습 공간{" "}
              <Text style={{ color: colors.ink }}> / {eyebrow}</Text>
            </Text>
          ) : (
            <Brand />
          )}
          {desktop ? (
            <Text style={s.topicLabel}>
              {topic?.name || "책과 함께 시작하는 배움"}
            </Text>
          ) : (
            <AppearanceToggle compact />
          )}
        </View>
        <View style={s.pageHeading}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Text
            accessibilityRole="header"
            style={[s.title, desktop && { fontSize: 38, lineHeight: 49 }]}
          >
            {title}
          </Text>
          {description && <Text style={s.description}>{description}</Text>}
        </View>
        {children}
        <View style={s.pageFooter}>
          <View style={s.divider} />
          <Text style={s.sub}>책길 · 알고 있는 개념에서 다음 배움으로</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.segmented}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.value, disabled }}
          aria-selected={value === option.value}
          aria-disabled={disabled}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            s.segment,
            value === option.value && s.selectedSegment,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              s.segmentText,
              value === option.value && { color: colors.ink },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TopicPicker() {
  const { topics, topic, selectTopic } = useLearning();
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.fieldLabel}>살펴볼 분야</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {topics
          .filter((t) => t.parentId !== null)
          .map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={t.name}
              accessibilityState={{ selected: t.id === topic?.id }}
              aria-selected={t.id === topic?.id}
              onPress={() => selectTopic(t)}
              style={({ pressed }) => [
                s.chip,
                t.id === topic?.id && s.activeChip,
                pressed && { opacity: 0.75 },
              ]}
            >
              {t.id === topic?.id && <View style={s.activeDot} />}
              <Text
                style={[
                  s.chipText,
                  t.id === topic?.id && {
                    color: colors.green,
                    fontWeight: "600",
                  },
                ]}
              >
                {t.name}
              </Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

export function Loading() {
  return (
    <ActivityIndicator
      size="small"
      color={colors.green}
      style={{ margin: 24 }}
      accessibilityLabel="불러오는 중"
    />
  );
}

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: {
    paddingTop: 22,
    width: "100%",
    maxWidth: design.contentMaxWidth,
    alignSelf: "center",
    gap: 24,
  },
  chrome: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  breadcrumb: { fontSize: 11, color: colors.muted, flexShrink: 1 },
  topicLabel: {
    fontSize: 11,
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  pageHeading: { gap: 10, paddingBottom: 7 },
  eyebrow: { fontSize: 12, fontWeight: "600", color: colors.green },
  title: {
    fontSize: 29,
    fontWeight: "600",
    lineHeight: 39,
    letterSpacing: -1.2,
    color: colors.ink,
  },
  description: {
    fontSize: 14,
    lineHeight: 23,
    color: colors.muted,
    maxWidth: 660,
  },
  cardContent: { padding: 22, gap: 14 },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 24,
    padding: 22,
    gap: 14,
    borderColor: colors.glassLine,
    borderWidth: 1,
    boxShadow: design.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 27,
    letterSpacing: -0.35,
  },
  body: { fontSize: 14, lineHeight: 23, color: colors.ink },
  sub: { fontSize: 12, lineHeight: 20, color: colors.muted },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },
  button: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    overflow: "hidden",
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.green,
    borderColor: "rgba(255,255,255,0.5)",
    boxShadow: "0 5px 16px rgba(23,106,87,0.13)",
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: colors.glassLine,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 21,
    textAlign: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(231,245,238,0.9)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    padding: 17,
    gap: 11,
  },
  noticeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  chips: { gap: 7, paddingBottom: 3 },
  chip: {
    minHeight: 44,
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.64)",
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  activeChip: { backgroundColor: colors.soft, borderColor: "#AECFC2" },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  chipText: { fontSize: 12, color: colors.muted },
  segmented: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    backgroundColor: "rgba(218,229,234,0.62)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.glassLine,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  segment: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 13,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedSegment: {
    backgroundColor: colors.paper,
    borderColor: colors.glassLine,
    boxShadow: "0 2px 5px rgba(32,54,61,0.07)",
  },
  segmentText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  badge: {
    backgroundColor: colors.soft,
    color: colors.green,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(79,109,121,0.15)",
    width: "100%",
  },
  pageFooter: { gap: 14, marginTop: 14 },
});
