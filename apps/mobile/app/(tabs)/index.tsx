import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnalyzingOverlay } from "../../src/components/AnalyzingOverlay";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { createAnalysis } from "../../src/lib/api";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

const CHIPS = [
  { label: "Fortes", color: colors.strengths, background: colors.strengthsSoft },
  { label: "Atenção", color: colors.attention, background: colors.attentionSoft },
  { label: "Sugestões", color: colors.suggestions, background: colors.suggestionsSoft },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndSend() {
    setError(null);
    let picked: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir o seletor de arquivos.",
      );
      return;
    }
    if (picked.canceled || !picked.assets[0]) return;

    const file = picked.assets[0];
    setBusy(true);
    try {
      const analysis = await createAnalysis(
        file.uri,
        file.name ?? "curriculo.pdf",
        file.mimeType ?? "application/pdf",
      );
      router.push(`/analise/${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível analisar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.content}>
        <Text style={styles.brand}>LinkUP</Text>
        <Text style={styles.title}>Seu currículo, com o que melhorar agora.</Text>
        <Text style={styles.body}>
          Feedback em três blocos — sem nota genérica, sem enrolação.
        </Text>

        <View style={styles.chips}>
          {CHIPS.map((chip) => (
            <View key={chip.label} style={[styles.chip, { backgroundColor: chip.background }]}>
              <Text style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={pickAndSend}
          disabled={busy}
          style={({ pressed }) => [styles.dropzone, pressed && styles.dropzonePressed, error && styles.dropzoneError]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={28} color={error ? colors.error : colors.accent} />
          </View>
          <Text style={styles.dropTitle}>Toque para escolher um PDF</Text>
          <Text style={styles.dropHint}>Currículo em PDF com texto selecionável</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
              <Text style={styles.retryHint}>Toque de novo para tentar</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <PrimaryButton
        label="Enviar currículo em PDF"
        onPress={pickAndSend}
        disabled={busy}
        style={styles.cta}
      />

      <AnalyzingOverlay visible={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    justifyContent: "space-between",
  },
  content: {
    gap: spacing.md,
    flex: 1,
  },
  brand: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  dropzonePressed: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  dropzoneError: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  dropTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  dropHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  errorBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
    alignItems: "center",
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    lineHeight: 20,
  },
  retryHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.error,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
