import React, { useState } from "react";
import { Platform, Pressable, PressableProps, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

export function FocusPressable({
  style,
  onFocus,
  onBlur,
  ...props
}: PressableProps) {
  const [focused, setFocused] = useState(false);
  // RN Web activates radio-role pressables with Enter; also support the standard Space key.
  const keyboardProps =
    Platform.OS === "web" && props.accessibilityRole === "radio"
      ? {
          onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
            if (
              !props.disabled &&
              event.key === " " &&
              !event.repeat &&
              event.target === event.currentTarget
            ) {
              event.preventDefault();
              event.currentTarget.click();
            }
          },
        }
      : {};
  return (
    <Pressable
      {...props}
      {...keyboardProps}
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
