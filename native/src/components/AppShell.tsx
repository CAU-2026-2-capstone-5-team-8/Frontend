import { BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";
import { colors, design } from "../theme/tokens";
import { GlassSurface } from "./GlassSurface";
import { Icon, IconName } from "./Icon";
import { FocusPressable as Pressable } from "./FocusPressable";

const destinations: {
  href: "/" | "/map" | "/recommendations" | "/account" | "/shelf";
  label: string;
  mobileLabel: string;
  icon: IconName;
}[] = [
  { href: "/", label: "책 찾기", mobileLabel: "책 찾기", icon: "book" },
  {
    href: "/map",
    label: "나의 개념 지도",
    mobileLabel: "개념 지도",
    icon: "map",
  },
  {
    href: "/recommendations",
    label: "맞춤 추천",
    mobileLabel: "맞춤 추천",
    icon: "sparkles",
  },
  { href: "/shelf", label: "내 서재", mobileLabel: "내 서재", icon: "shelf" },
  {
    href: "/account",
    label: "내 계정",
    mobileLabel: "내 계정",
    icon: "account",
  },
];

export function Brand() {
  return (
    <View style={styles.brand}>
      <LinearGradient colors={["#4D9B87", "#1F6357"]} style={styles.brandIcon}>
        <Icon name="book" color={colors.paper} size={23} />
      </LinearGradient>
      <View>
        <Text style={styles.brandName}>책길</Text>
        <Text style={styles.brandCaption}>배움의 다음 장</Text>
      </View>
    </View>
  );
}

export function AppearanceToggle({ compact = false }: { compact?: boolean }) {
  const { reduceTransparency, systemReduced, ready, toggleTransparency } =
    useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="투명 효과 줄이기"
      accessibilityHint={
        systemReduced
          ? "시스템 접근성 설정이 적용되어 있습니다"
          : "배경 효과를 줄여 화면을 선명하게 표시합니다"
      }
      accessibilityState={{
        checked: reduceTransparency,
        disabled: !ready || systemReduced,
      }}
      aria-checked={reduceTransparency}
      aria-disabled={!ready || systemReduced}
      disabled={!ready || systemReduced}
      onPress={toggleTransparency}
      style={({ pressed }) => [
        styles.appearance,
        compact && styles.compactAppearance,
        reduceTransparency && { backgroundColor: colors.soft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name="contrast" size={18} color={colors.muted} />
      {!compact && <Text style={styles.appearanceLabel}>투명 효과 줄이기</Text>}
    </Pressable>
  );
}

export function Backdrop() {
  const { reduceTransparency } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={["#E8F1F5", "#F3F4F7", "#EAF3F0"]}
        style={StyleSheet.absoluteFill}
      />
      {!reduceTransparency && (
        <Svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 1440 1000"
        >
          <Defs>
            <RadialGradient id="mint" cx="0.08" cy="0.2" rx="0.65" ry="0.7">
              <Stop offset="0" stopColor="#A4D9C8" stopOpacity={0.68} />
              <Stop offset="1" stopColor="#A4D9C8" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="blue" cx="0.95" cy="0.0" rx="0.7" ry="0.65">
              <Stop offset="0" stopColor="#B4CDED" stopOpacity={0.72} />
              <Stop offset="1" stopColor="#B4CDED" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="lilac" cx="0.8" cy="0.95" rx="0.6" ry="0.7">
              <Stop offset="0" stopColor="#DDD0EB" stopOpacity={0.64} />
              <Stop offset="1" stopColor="#DDD0EB" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={1440} height={1000} fill="url(#mint)" />
          <Rect width={1440} height={1000} fill="url(#blue)" />
          <Rect width={1440} height={1000} fill="url(#lilac)" />
        </Svg>
      )}
    </View>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const desktop = width >= design.desktopBreakpoint;
  const { bottom, top } = useSafeAreaInsets();
  const pathname = usePathname();
  const { blurTarget } = useTheme();
  return (
    <View style={styles.root}>
      <BlurTargetView
        pointerEvents="none"
        ref={blurTarget}
        style={StyleSheet.absoluteFill}
      >
        <Backdrop />
      </BlurTargetView>
      <View
        style={[
          styles.content,
          desktop && {
            marginLeft: design.sidebarWidth + design.sidebarGutter * 2,
          },
        ]}
      >
        {children}
      </View>
      <GlassSurface
        navigation
        style={
          desktop
            ? [styles.sidebar, { top: top + 24 }]
            : [styles.dock, { bottom: Math.max(12, bottom) }]
        }
        contentStyle={desktop ? styles.sidebarContent : styles.dockContent}
      >
        {desktop && (
          <>
            <Brand />
            <Text style={styles.sectionLabel}>나의 학습 공간</Text>
          </>
        )}
        {destinations.map((item) => {
          const selected =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/book/")
              : pathname === item.href;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => router.replace(item.href)}
              style={({ pressed }) => [
                styles.navItem,
                !desktop && styles.mobileNavItem,
                selected && styles.selectedItem,
                pressed && { opacity: 0.72 },
              ]}
            >
              <Icon
                name={item.icon}
                color={selected ? colors.paper : colors.muted}
                size={desktop ? 20 : 22}
              />
              <Text
                style={[
                  styles.navLabel,
                  !desktop && styles.mobileNavLabel,
                  selected && { color: colors.paper },
                ]}
              >
                {desktop ? item.label : item.mobileLabel}
              </Text>
            </Pressable>
          );
        })}
        {desktop && (
          <View style={styles.sidebarFooter}>
            <View style={styles.footerRule} />
            <Text style={styles.footerTitle}>알고 있는 개념에서,</Text>
            <Text style={styles.footerCopy}>다음 배움으로 이어가세요.</Text>
            <AppearanceToggle />
          </View>
        )}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  sidebar: {
    position: "absolute",
    left: 24,
    bottom: 24,
    width: design.sidebarWidth,
  },
  sidebarContent: { padding: 16, paddingTop: 26, gap: 8, flexGrow: 1 },
  brand: { flexDirection: "row", gap: 11, alignItems: "center" },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    boxShadow: "0 4px 14px rgba(31,99,87,0.18)",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
  },
  brandCaption: { fontSize: 10, color: colors.muted, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 42,
    marginBottom: 10,
    marginLeft: 10,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    borderRadius: 17,
  },
  selectedItem: {
    backgroundColor: colors.ink,
    boxShadow: "0 4px 12px rgba(32,54,61,0.12)",
  },
  navLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  sidebarFooter: { marginTop: "auto", padding: 10, gap: 7 },
  footerRule: {
    height: 1,
    backgroundColor: "rgba(79,109,121,0.15)",
    marginBottom: 18,
  },
  footerTitle: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  footerCopy: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 20,
  },
  appearance: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  compactAppearance: {
    width: 44,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  appearanceLabel: { fontSize: 11, color: colors.muted },
  dock: {
    position: "absolute",
    left: 14,
    right: 14,
    maxWidth: 440,
    alignSelf: "center",
    marginHorizontal: "auto",
  },
  dockContent: { flexDirection: "row", padding: 7, gap: 5 },
  mobileNavItem: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 4,
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    borderRadius: 20,
  },
  mobileNavLabel: { fontSize: 11 },
});
