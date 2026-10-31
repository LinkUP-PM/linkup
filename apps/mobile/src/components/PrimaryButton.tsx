import { Platform, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";

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

  function handlePress() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
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
    minHeight: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
  },
  ghost: {
    backgroundColor: "transparent",
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: type.headline.fontSize,
  },
  labelPrimary: {
    color: colors.ink,
  },
  labelSecondary: {
    color: colors.ink,
  },
  labelGhost: {
    color: colors.accent,
  },
});
