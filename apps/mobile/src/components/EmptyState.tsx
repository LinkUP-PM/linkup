import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme/tokens";
import { BrandLogo, brandLogoSizes } from "./BrandLogo";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Soft framed mark above the copy for “ainda não há nada” empties. */
  brand?: boolean;
};

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  brand = false,
}: Props) {
  return (
    <View style={styles.container}>
      {brand ? (
        <BrandLogo
          variant="mark"
          size={brandLogoSizes.empty}
          framed
          style={styles.brand}
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <PrimaryButton label={secondaryLabel} onPress={onSecondary} variant="ghost" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  brand: {
    marginBottom: spacing.sm,
  },
  title: {
    ...type.title2,
    color: colors.ink,
  },
  body: {
    ...type.body,
    color: colors.muted,
  },
  button: {
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
