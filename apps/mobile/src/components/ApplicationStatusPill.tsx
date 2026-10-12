import { StyleSheet, Text, View } from "react-native";
import type { ApplicationStatus } from "@linkup/shared";
import { APPLICATION_STATUS_LABELS } from "@linkup/shared";
import { colors, fonts, radius, spacing } from "../theme/tokens";

const STATUS_META: Record<ApplicationStatus, { color: string; background: string }> = {
  SUBMITTED: { color: colors.accent, background: colors.accentSoft },
  DISCARDED: { color: colors.muted, background: colors.border },
  FORWARDED: { color: colors.attention, background: colors.attentionSoft },
  ADJUSTMENT_REQUESTED: { color: colors.attention, background: colors.attentionSoft },
  ACCEPTED: { color: colors.strengths, background: colors.strengthsSoft },
  REJECTED: { color: colors.error, background: colors.errorSoft },
};

type Props = {
  status: ApplicationStatus;
};

export function ApplicationStatusPill({ status }: Props) {
  const meta = STATUS_META[status] ?? STATUS_META.SUBMITTED;
  return (
    <View style={[styles.pill, { backgroundColor: meta.background }]}>
      <Text style={[styles.label, { color: meta.color }]}>
        {APPLICATION_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
});
