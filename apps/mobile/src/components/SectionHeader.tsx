import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../theme/tokens";

type Tone = "strengths" | "attention" | "suggestions" | "neutral";

const TONE: Record<Tone, { color: string; background: string }> = {
  strengths: { color: colors.strengths, background: colors.strengthsSoft },
  attention: { color: colors.attention, background: colors.attentionSoft },
  suggestions: { color: colors.suggestions, background: colors.suggestionsSoft },
  neutral: { color: colors.ink, background: colors.surfaceElevated },
};

type Props = {
  title: string;
  tone?: Tone;
  count?: number;
};

export function SectionHeader({ title, tone = "neutral", count }: Props) {
  const meta = TONE[tone];
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: meta.background }]}>
        <Text style={[styles.badgeText, { color: meta.color }]}>
          {count != null ? `${count}` : "·"}
        </Text>
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...type.footnote,
    fontFamily: type.headline.fontFamily,
  },
  title: {
    ...type.title2,
    color: colors.ink,
  },
});
