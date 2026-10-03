import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, s } from "./ui";
export function AccountField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          s.body,
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.paper,
            borderRadius: 14,
            padding: 12,
            ...(props.multiline
              ? { minHeight: 96, textAlignVertical: "top" as const }
              : {}),
          },
        ]}
      />
    </View>
  );
}
