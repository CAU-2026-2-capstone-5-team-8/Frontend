import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { colors, design } from "../theme/tokens";

export function GlassSurface({
  children,
  style,
  contentStyle,
  navigation = false,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  navigation?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { reduceTransparency, blurTarget } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const content = (
    <View
      style={[
        styles.frame,
        navigation && styles.navigation,
        reduceTransparency && styles.opaque,
      ]}
    >
      {navigation && !reduceTransparency && (
        <BlurView
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          tint="light"
          intensity={55}
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
        />
      )}
      {!reduceTransparency && (
        <LinearGradient
          pointerEvents="none"
          colors={
            navigation
              ? ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.16)"]
              : ["rgba(255,255,255,0.38)", "rgba(255,255,255,0.08)"]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View style={contentStyle}>{children}</View>
    </View>
  );
  const base = [styles.shell, navigation && styles.navigationShell, style];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        base,
        hovered && styles.hovered,
        focused && styles.focused,
        pressed && { opacity: 0.86 },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={base}>{content}</View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: design.radius.surface, boxShadow: design.shadow },
  frame: {
    borderRadius: design.radius.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.glass,
    flexGrow: 1,
  },
  navigation: {
    backgroundColor:
      Platform.OS === "android" && Number(Platform.Version) < 31
        ? "#F7FAFC"
        : "rgba(244,249,252,0.36)",
  },
  navigationShell: { boxShadow: design.elevatedShadow },
  opaque: { backgroundColor: colors.paper, borderColor: colors.line },
  hovered: { boxShadow: "0 14px 38px rgba(37,66,83,0.13)" },
  focused: {
    outlineColor: colors.green,
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineOffset: 3,
  },
});
