import { router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, design } from "../theme/tokens";
import { Icon, IconName } from "./Icon";
import { FocusPressable as Pressable } from "./FocusPressable";

const destinations: {
  href: "/" | "/map" | "/recommendations" | "/shelf" | "/account";
  label: string;
  icon: IconName;
}[] = [
  { href: "/", label: "책 찾기", icon: "book" },
  { href: "/recommendations", label: "맞춤 추천", icon: "sparkles" },
  { href: "/map", label: "개념 지도", icon: "map" },
  { href: "/shelf", label: "내 서재", icon: "shelf" },
  { href: "/account", label: "내 계정", icon: "account" },
];

export function Brand() {
  return (
    <View style={styles.brand}>
      <Icon name="book" color={colors.green} size={28} />
      <Text style={styles.brandName}>책길</Text>
    </View>
  );
}
export function Backdrop() {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]}
    />
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const desktop = useWindowDimensions().width >= design.desktopBreakpoint;
  const { top, bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const navigation = (
    <View style={[styles.navigation, !desktop && styles.mobileNavigation]}>
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
              !desktop && styles.mobileItem,
              desktop && selected && styles.selected,
              pressed && { opacity: 0.7 },
            ]}
          >
            {!desktop && (
              <Icon
                name={item.icon}
                color={selected ? colors.green : colors.muted}
                size={22}
              />
            )}
            <Text
              style={[
                styles.navLabel,
                !desktop && styles.mobileLabel,
                selected && {
                  color: desktop ? colors.ink : colors.green,
                  fontWeight: "700",
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={styles.root}>
      <View style={[styles.headerBorder, { paddingTop: top }]}>
        <View style={[styles.header, !desktop && styles.mobileHeader]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="책길 홈"
            onPress={() => router.replace("/")}
          >
            <Brand />
          </Pressable>
          {desktop ? (
            navigation
          ) : (
            <Text style={styles.tagline}>책과 함께, 한 걸음 더.</Text>
          )}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      {!desktop && (
        <View style={[styles.bottom, { paddingBottom: bottom }]}>
          {navigation}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  headerBorder: { borderBottomWidth: 1, borderColor: colors.line },
  header: {
    width: "100%",
    maxWidth: design.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: 40,
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileHeader: { height: 64, paddingHorizontal: 20 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  tagline: { color: colors.muted, fontSize: 11 },
  navigation: { flexDirection: "row", gap: 30, height: "100%" },
  navItem: {
    justifyContent: "center",
    minHeight: 48,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  selected: { borderColor: colors.ink },
  navLabel: { color: colors.muted, fontSize: 14 },
  mobileNavigation: { gap: 0, height: 64 },
  mobileItem: { flex: 1, alignItems: "center", gap: 5 },
  mobileLabel: { fontSize: 10 },
  bottom: {
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  content: { flex: 1, minHeight: 0 },
});
