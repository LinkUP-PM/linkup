import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnalyzingOverlay } from "../../src/components/AnalyzingOverlay";
import { BrandLogo, brandLogoSizes } from "../../src/components/BrandLogo";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SaveResumeSheet } from "../../src/components/SaveResumeSheet";
import { createAnalysis, type UploadFileInput } from "../../src/lib/api";
import { pickPdf } from "../../src/lib/pick-pdf";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

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
  const [pendingFile, setPendingFile] = useState<UploadFileInput | null>(null);

  const continueWithFile = useCallback(
    async (file: UploadFileInput) => {
      setPendingFile(null);
      setBusy(true);
      setError(null);
      try {
        const analysis = await createAnalysis(file);
        router.push(`/analise/${analysis.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível analisar o arquivo.");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  async function pickAndSend() {
    setError(null);
    let file: Awaited<ReturnType<typeof pickPdf>>;
    try {
      file = await pickPdf();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir o seletor de arquivos.",
      );
      return;
    }
    if (!file) return;
    setPendingFile(file);
  }

  const handleSaveError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.tabBarClearance - 24 },
      ]}
    >
      <View style={styles.content}>
        <BrandLogo
          variant="wordmark"
          width={brandLogoSizes.compact}
          style={styles.brand}
        />
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
          onPress={() => void pickAndSend()}
          disabled={busy || pendingFile != null}
          style={({ pressed }) => [
            styles.dropzone,
            pressed && styles.dropzonePressed,
            error && styles.dropzoneError,
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="document-text-outline"
              size={28}
              color={error ? colors.error : colors.accent}
            />
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
        onPress={() => void pickAndSend()}
        disabled={busy || pendingFile != null}
        style={styles.cta}
      />

      <SaveResumeSheet
        visible={pendingFile != null}
        file={pendingFile}
        onSkip={() => {
          if (pendingFile) void continueWithFile(pendingFile);
        }}
        onSaved={() => {
          if (pendingFile) void continueWithFile(pendingFile);
        }}
        onError={handleSaveError}
      />

      <AnalyzingOverlay visible={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    flex: 1,
  },
  brand: {
    marginBottom: spacing.xs,
  },
  title: {
    ...type.title1,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  body: {
    ...type.body,
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
    borderColor: colors.separator,
    borderRadius: radius.group,
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
    ...type.headline,
    color: colors.ink,
  },
  dropHint: {
    ...type.footnote,
    color: colors.muted,
    textAlign: "center",
  },
  errorBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
    alignItems: "center",
  },
  error: {
    ...type.footnote,
    color: colors.error,
    textAlign: "center",
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
