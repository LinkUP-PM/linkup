import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 32,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.muted,
    lineHeight: 24,
  },
  button: {
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
