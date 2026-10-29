import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { Job } from "@linkup/shared";
import { AnalyzingOverlay } from "../../src/components/AnalyzingOverlay";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { applyToJob, getJob } from "../../src/lib/api";
import { pickPdf } from "../../src/lib/pick-pdf";
import { colors, fonts, spacing } from "../../src/theme/tokens";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setJob(await getJob(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a vaga.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function pickAndApply() {
    if (!id) return;
    setError(null);
    let file: Awaited<ReturnType<typeof pickPdf>>;
    try {
      file = await pickPdf();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível abrir o seletor de arquivos.",
      );
      return;
    }
    if (!file) return;

    setBusy(true);
    try {
      const application = await applyToJob(id, file);
      router.replace(`/candidatura/${application.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a candidatura.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Vaga não encontrada."}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{job.title}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <Text style={styles.body}>{job.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>O que procura</Text>
          <Text style={styles.body}>{job.lookingFor}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Candidatar com PDF"
          onPress={() => void pickAndApply()}
          disabled={busy}
          style={styles.cta}
        />
      </ScrollView>
      <AnalyzingOverlay visible={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  section: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
