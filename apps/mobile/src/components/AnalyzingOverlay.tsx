import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../theme/tokens";

const STEPS = [
  "Lendo o PDF…",
  "O que já funciona…",
  "O que dá para melhorar…",
] as const;

type Props = {
  visible: boolean;
};

export function AnalyzingOverlay({ visible }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    const id = setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 2000);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.title}>Analisando</Text>
          <Text style={styles.step}>{STEPS[step]}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.capsule,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    ...type.title2,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  step: {
    ...type.callout,
    color: colors.muted,
    textAlign: "center",
  },
});
