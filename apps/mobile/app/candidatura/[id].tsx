import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { ApplicationDetail, ApplicationStatus, Resume } from "@linkup/shared";
import { APPLICATION_STATUS_LABELS, INTERVIEW_STATUS_LABELS } from "@linkup/shared";
import { AnalyzingOverlay } from "../../src/components/AnalyzingOverlay";
import { ApplicationStatusPill } from "../../src/components/ApplicationStatusPill";
import { PickResumeSheet } from "../../src/components/PickResumeSheet";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SaveResumeSheet } from "../../src/components/SaveResumeSheet";
import {
  getApplication,
  getResumeUploadInput,
  respondInterview,
  resubmitApplication,
  type UploadFileInput,
} from "../../src/lib/api";
import { formatInterviewWhen } from "../../src/lib/interview-datetime";
import { pickPdf } from "../../src/lib/pick-pdf";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

const TIMELINE_STEPS: ApplicationStatus[] = [
  "SUBMITTED",
  "FORWARDED",
  "ADJUSTMENT_REQUESTED",
  "ACCEPTED",
];

function statusHint(status: ApplicationStatus): string {
  switch (status) {
    case "SUBMITTED":
      return "O recrutador ainda não triou esta candidatura. Quando houver decisão, o status muda aqui.";
    case "DISCARDED":
      return "Esta candidatura não avançou na triagem.";
    case "FORWARDED":
      return "Encaminhada ao contratante. Aguarde a decisão.";
    case "ADJUSTMENT_REQUESTED":
      return "O contratante pediu ajustes. Reenvie o PDF com as mudanças.";
    case "ACCEPTED":
      return "O contratante aceitou esta candidatura. Se houver data de entrevista, ela aparece abaixo.";
    case "REJECTED":
      return "O contratante recusou esta candidatura.";
  }
}

function timelineReached(status: ApplicationStatus, step: ApplicationStatus): boolean {
  if (status === "DISCARDED") return step === "SUBMITTED";
  if (status === "REJECTED") {
    return step === "SUBMITTED" || step === "FORWARDED";
  }
  if (status === "ACCEPTED") {
    return step === "SUBMITTED" || step === "FORWARDED" || step === "ACCEPTED";
  }
  if (status === "ADJUSTMENT_REQUESTED") {
    return step === "SUBMITTED" || step === "FORWARDED" || step === "ADJUSTMENT_REQUESTED";
  }
  if (status === "FORWARDED") {
    return step === "SUBMITTED" || step === "FORWARDED";
  }
  return step === "SUBMITTED";
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<UploadFileInput | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setItem(await getApplication(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a candidatura.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function resubmitWithFile(file: UploadFileInput) {
    if (!id) return;
    setPendingFile(null);
    setPickerOpen(false);
    setBusy(true);
    setError(null);
    try {
      const updated = await resubmitApplication(id, file);
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reenviar o PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function resubmitWithResume(resume: Resume) {
    setPickerOpen(false);
    setError(null);
    setBusy(true);
    try {
      const file = await getResumeUploadInput(resume.id);
      const updated = await resubmitApplication(id!, file);
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reenviar o PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function pickAdHocPdf() {
    setPickerOpen(false);
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
    setPendingFile(file);
  }

  async function onRespondInterview(action: "ACCEPT" | "DECLINE") {
    const proposed = (item?.interviews ?? []).find((entry) => entry.status === "PROPOSED");
    if (!proposed) return;
    setBusy(true);
    setError(null);
    try {
      setItem(await respondInterview(proposed.id, { action }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível responder à data da entrevista.",
      );
    } finally {
      setBusy(false);
    }
  }

  const handleSaveError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Candidatura não encontrada."}</Text>
        <Pressable onPress={load}>
          <Text style={styles.retry}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  const showAdjustmentMessage =
    item.status === "ADJUSTMENT_REQUESTED" ||
    item.status === "REJECTED" ||
    (item.decisionMessage != null && item.decisionMessage.length > 0);
  const interviews = item.interviews ?? [];
  const currentInterview =
    interviews.find((entry) => entry.status === "PROPOSED" || entry.status === "ACCEPTED") ??
    null;
  const lastDeclined =
    !currentInterview && interviews.find((entry) => entry.status === "DECLINED");

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <ApplicationStatusPill status={item.status} />
        <Text style={styles.title}>{item.jobTitle}</Text>
        <Text style={styles.meta}>Enviada {relativeTime(item.createdAt)}</Text>

        <View style={styles.timeline}>
          <Text style={styles.timelineLabel}>Linha do tempo</Text>
          {item.status === "DISCARDED" || item.status === "REJECTED" ? (
            <View style={styles.step}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.stepBody}>
                <Text style={styles.timelineValue}>
                  {APPLICATION_STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>
          ) : (
            TIMELINE_STEPS.filter((step) => {
              if (step === "ADJUSTMENT_REQUESTED" && item.status !== "ADJUSTMENT_REQUESTED") {
                return false;
              }
              if (step === "ACCEPTED" && item.status !== "ACCEPTED") {
                return false;
              }
              return true;
            }).map((step) => {
              const reached = timelineReached(item.status, step);
              return (
                <View key={step} style={styles.step}>
                  <View style={[styles.dot, reached && styles.dotActive]} />
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepTitle, reached && styles.stepTitleActive]}>
                      {APPLICATION_STATUS_LABELS[step]}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          <Text style={styles.timelineHint}>{statusHint(item.status)}</Text>
        </View>

        {showAdjustmentMessage && item.decisionMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>
              {item.status === "REJECTED" ? "Motivo da recusa" : "Pedido de ajuste"}
            </Text>
            <Text style={styles.messageBody}>{item.decisionMessage}</Text>
          </View>
        ) : null}

        {item.status === "ACCEPTED" ? (
          <View style={styles.interviewBox}>
            <Text style={styles.messageLabel}>Entrevista</Text>
            {currentInterview?.status === "PROPOSED" ? (
              <>
                <Text style={styles.messageBody}>
                  O contratante propôs {formatInterviewWhen(currentInterview.scheduledAt)}.
                </Text>
                <PrimaryButton
                  label="Aceitar data"
                  onPress={() => void onRespondInterview("ACCEPT")}
                  disabled={busy}
                />
                <PrimaryButton
                  label="Recusar data"
                  onPress={() => void onRespondInterview("DECLINE")}
                  disabled={busy}
                  variant="secondary"
                />
              </>
            ) : currentInterview?.status === "ACCEPTED" ? (
              <Text style={styles.messageBody}>
                Data confirmada: {formatInterviewWhen(currentInterview.scheduledAt)}.
              </Text>
            ) : lastDeclined ? (
              <Text style={styles.messageBody}>
                Você recusou {formatInterviewWhen(lastDeclined.scheduledAt)}. Aguarde o
                contratante marcar outro dia.
              </Text>
            ) : (
              <Text style={styles.messageBody}>
                Ainda não há data de entrevista. O contratante define o dia.
              </Text>
            )}
            {interviews.length > 1 ? (
              <View style={styles.interviewHistory}>
                {interviews.map((entry) => (
                  <Text key={entry.id} style={styles.meta}>
                    {INTERVIEW_STATUS_LABELS[entry.status]} ·{" "}
                    {formatInterviewWhen(entry.scheduledAt)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {error ? <Text style={styles.errorInline}>{error}</Text> : null}

        {item.status === "ADJUSTMENT_REQUESTED" ? (
          <PrimaryButton
            label="Reenviar PDF ajustado"
            onPress={() => setPickerOpen(true)}
            disabled={busy}
          />
        ) : null}

        <PrimaryButton
          label="Ver análise do currículo"
          onPress={() => router.push(`/analise/${item.analysisId}` as Href)}
          variant="secondary"
        />
      </ScrollView>
      <PickResumeSheet
        visible={pickerOpen}
        title="Reenviar com qual currículo?"
        extraLabel="Enviar um PDF ajustado"
        onExtra={() => void pickAdHocPdf()}
        emptyActionLabel="Enviar um PDF ajustado"
        onEmptyAction={() => void pickAdHocPdf()}
        onSelect={(resume) => void resubmitWithResume(resume)}
        onClose={() => setPickerOpen(false)}
      />
      <SaveResumeSheet
        visible={pendingFile != null}
        file={pendingFile}
        onSkip={() => {
          if (pendingFile) void resubmitWithFile(pendingFile);
        }}
        onSaved={() => {
          if (pendingFile) void resubmitWithFile(pendingFile);
        }}
        onError={handleSaveError}
      />
      <AnalyzingOverlay visible={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  timeline: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    gap: spacing.md,
  },
  timelineLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  step: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    marginTop: 5,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
  },
  stepTitleActive: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  timelineValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  timelineHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  messageBox: {
    backgroundColor: colors.attentionSoft,
    borderRadius: radius.input,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  messageLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  messageBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  interviewBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    padding: spacing.lg,
    gap: spacing.md,
  },
  interviewHistory: {
    gap: spacing.xs,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    lineHeight: 20,
  },
  errorInline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  retry: {
    fontFamily: fonts.bodyBold,
    color: colors.error,
  },
});
