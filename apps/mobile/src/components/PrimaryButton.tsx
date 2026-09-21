import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled, variant = "primary", style }: Props) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === "ghost" && styles.ghost,
        (pressed || disabled) && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          isPrimary && styles.labelPrimary,
          isSecondary && styles.labelSecondary,
          variant === "ghost" && styles.labelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSecondary: {
    color: colors.ink,
  },
  labelGhost: {
    color: colors.accent,
  },
});
