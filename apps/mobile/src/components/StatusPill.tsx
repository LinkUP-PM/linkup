import { StyleSheet, Text, View } from "react-native";
import type { AnalysisStatus } from "@linkup/shared";
import { colors, fonts, radius, spacing } from "../theme/tokens";

const STATUS_META: Record<
  AnalysisStatus,
  { label: string; color: string; background: string }
> = {
  PENDING: { label: "Pendente", color: colors.muted, background: colors.border },
  EXTRACTING: { label: "Extraindo", color: colors.attention, background: colors.attentionSoft },
  ANALYZING: { label: "Analisando", color: colors.accent, background: colors.accentSoft },
  COMPLETED: { label: "Concluída", color: colors.strengths, background: colors.strengthsSoft },
  FAILED: { label: "Falhou", color: colors.error, background: colors.errorSoft },
};

type Props = {
  status: AnalysisStatus;
};

export function StatusPill({ status }: Props) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <View style={[styles.pill, { backgroundColor: meta.background }]}>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
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
