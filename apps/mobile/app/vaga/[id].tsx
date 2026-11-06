import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { Job, Resume } from "@linkup/shared";
import { AnalyzingOverlay } from "../../src/components/AnalyzingOverlay";
import { JobPreview } from "../../src/components/JobPreview";
import { PickResumeSheet } from "../../src/components/PickResumeSheet";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { applyToJob, getJob, getResumeUploadInput, listResumes } from "../../src/lib/api";
import { colors, fonts, spacing } from "../../src/theme/tokens";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hasResumes, setHasResumes] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [nextJob, resumes] = await Promise.all([getJob(id), listResumes()]);
      setJob(nextJob);
      setHasResumes(resumes.length > 0);
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

  async function applyWithResume(resume: Resume) {
    if (!id) return;
    setPickerOpen(false);
    setError(null);
    setBusy(true);
    try {
      const file = await getResumeUploadInput(resume.id);
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
        <JobPreview job={job} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hasResumes ? (
          <PrimaryButton
            label="Encaminhar currículo"
            onPress={() => setPickerOpen(true)}
            disabled={busy}
            style={styles.cta}
          />
        ) : (
          <PrimaryButton
            label="Salvar currículo no perfil"
            onPress={() => router.push("/perfil" as Href)}
            disabled={busy}
            style={styles.cta}
          />
        )}
      </ScrollView>
      <PickResumeSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(resume) => void applyWithResume(resume)}
        emptyActionLabel="Ir ao perfil"
        onEmptyAction={() => {
          setPickerOpen(false);
          router.push("/perfil" as Href);
        }}
      />
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
