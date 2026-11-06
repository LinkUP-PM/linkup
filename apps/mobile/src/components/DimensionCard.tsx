import { StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";

type Props = {
  title: string;
  summary: string;
  present?: string[];
  missing?: string[];
  presentLabel?: string;
  missingLabel?: string;
};

export function DimensionCard({
  title,
  summary,
  present,
  missing,
  presentLabel = "Presentes",
  missingLabel = "Pouco visíveis",
}: Props) {
  const hasPresent = (present?.length ?? 0) > 0;
  const hasMissing = (missing?.length ?? 0) > 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>

      {hasPresent ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{presentLabel}</Text>
          <View style={styles.chips}>
            {present!.map((item) => (
              <View key={item} style={[styles.chip, styles.chipPresent]}>
                <Text style={[styles.chipText, styles.chipTextPresent]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {hasMissing ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{missingLabel}</Text>
          <View style={styles.chips}>
            {missing!.map((item) => (
              <View key={item} style={[styles.chip, styles.chipMissing]}>
                <Text style={[styles.chipText, styles.chipTextMissing]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  title: {
    ...type.headline,
    color: colors.ink,
  },
  summary: {
    ...type.subhead,
    color: colors.muted,
  },
  group: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  groupLabel: {
    ...type.caption1,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipPresent: {
    backgroundColor: colors.strengthsSoft,
  },
  chipMissing: {
    backgroundColor: colors.attentionSoft,
  },
  chipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  chipTextPresent: {
    color: colors.strengths,
  },
  chipTextMissing: {
    color: colors.attention,
  },
});
