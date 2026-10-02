import React, { useState } from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

export function FocusPressable({
  style,
  onFocus,
  onBlur,
  ...props
}: PressableProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        focused && styles.focus,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  focus: {
    outlineColor: colors.green,
    outlineStyle: "solid",
    outlineWidth: 2,
    outlineOffset: 3,
  },
});
