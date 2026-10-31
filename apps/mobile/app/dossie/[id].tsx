import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type {
  ApplicationDetail,
  DecisionAction,
  Job,
  Me,
  RecruiterNoteAction,
  RecruiterTag,
} from "@linkup/shared";
import {
  APPLICATION_STATUS_LABELS,
  INTERVIEW_STATUS_LABELS,
  RECRUITER_TAG_LABELS,
  RECRUITER_TAGS,
} from "@linkup/shared";
import { ApplicationStatusPill } from "../../src/components/ApplicationStatusPill";
import { DossierAnalysis } from "../../src/components/DossierAnalysis";
import { EmptyState } from "../../src/components/EmptyState";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import {
  addRecruiterNote,
  decideApplication,
  discardApplication,
  forwardApplication,
  getApplication,
  getJob,
  getMe,
  proposeInterview,
  updateApplicationTags,
} from "../../src/lib/api";
import { formatInterviewWhen, localDateTimeToIso } from "../../src/lib/interview-datetime";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

const NOTE_ACTION_LABELS: Record<RecruiterNoteAction, string> = {
  NOTE: "Nota",
  FORWARD: "Encaminhamento",
  DISCARD: "Descarte",
};

export default function DossierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [item, setItem] = useState<ApplicationDetail | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [freeNote, setFreeNote] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<DecisionAction | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [user, app] = await Promise.all([getMe(), getApplication(id)]);
      setMe(user);
      setItem(app);
      if (user.role === "RECRUITER") {
        try {
          setJob(await getJob(app.jobId));
        } catch {
          setJob(null);
        }
      } else {
        setJob(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o dossiê.");
      setItem(null);
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

  async function onForward() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      setItem(await forwardApplication(id, note.trim() || undefined));
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível encaminhar.");
    } finally {
      setBusy(false);
    }
  }

  async function onDiscard() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      setItem(await discardApplication(id, note.trim() || undefined));
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível descartar.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveNote() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await addRecruiterNote(id, freeNote);
      setItem(updated);
      setFreeNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a nota.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleTag(tag: RecruiterTag) {
    if (!id || !item) return;
    const current = item.recruiterTags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setBusy(true);
    setError(null);
    try {
      setItem(await updateApplicationTags(id, next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar as tags.");
    } finally {
      setBusy(false);
    }
  }

  async function onDecide(action: DecisionAction) {
    if (!id) return;
    if (action === "REJECT" || action === "REQUEST_ADJUSTMENT") {
      if (message.trim().length < 3) {
        setError("Recusa e pedido de ajuste pedem um texto com pelo menos 3 caracteres.");
        setPendingAction(action);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      setItem(
        await decideApplication(id, {
          action,
          message:
            action === "REJECT" || action === "REQUEST_ADJUSTMENT"
              ? message.trim()
              : undefined,
        }),
      );
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a decisão.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function onProposeInterview() {
    if (!id) return;
    const iso = localDateTimeToIso(interviewDate, interviewTime);
    if (!iso) {
      setError("Use o formato DD/MM/AAAA e HH:MM.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setItem(await proposeInterview(id, { scheduledAt: iso }));
      setInterviewDate("");
      setInterviewTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível marcar a entrevista.");
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

  if (!item || !me?.role) {
    return (
      <EmptyState
        title="Dossiê indisponível"
        body={error ?? "Candidatura não encontrada."}
        actionLabel="Tentar de novo"
        onAction={load}
      />
    );
  }

  const role = me.role;
  const result = item.analysis?.result ?? null;
  const canTriage = role === "RECRUITER" && item.status === "SUBMITTED";
  const canDecide = role === "EMPLOYER" && item.status === "FORWARDED";
  const isResubmit = role === "RECRUITER" && (item.submissionCount ?? 1) > 1;
  const selectedTags = new Set(item.recruiterTags ?? []);
  const notes = item.recruiterNotes ?? [];
  const interviews = item.interviews ?? [];
  const currentInterview =
    interviews.find((entry) => entry.status === "PROPOSED" || entry.status === "ACCEPTED") ??
    null;
  const interviewLocked = currentInterview?.status === "ACCEPTED";
  const canSchedule =
    role === "EMPLOYER" && item.status === "ACCEPTED" && !interviewLocked;
  const showInterviewBlock =
    item.status === "ACCEPTED" &&
    (role === "EMPLOYER" || role === "RECRUITER" || interviews.length > 0);
  const candidateEmailForInterview =
    item.candidateEmail ??
    interviews.find((entry) => entry.candidateEmail)?.candidateEmail ??
    null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusRow}>
          <ApplicationStatusPill status={item.status} />
          {isResubmit ? (
            <Text style={styles.resubmitBadge}>Reenvio após ajuste</Text>
          ) : null}
        </View>
        <Text style={styles.title}>{item.jobTitle}</Text>
        {role === "RECRUITER" && item.candidateEmail ? (
          <Text style={styles.candidateEmail}>{item.candidateEmail}</Text>
        ) : null}
        <Text style={styles.meta}>
          {APPLICATION_STATUS_LABELS[item.status]} · atualizada {relativeTime(item.updatedAt)}
        </Text>

        {role === "RECRUITER" && job ? (
          <View style={styles.jobBrief}>
            <Text style={styles.messageLabel}>O que a vaga procura</Text>
            <Text style={styles.messageBody}>{job.lookingFor}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
          </View>
        ) : null}

        {role === "RECRUITER" ? (
          <View style={styles.tagsBlock}>
            <Text style={styles.messageLabel}>Tags internas</Text>
            <View style={styles.tagsRow}>
              {RECRUITER_TAGS.map((tag) => {
                const active = selectedTags.has(tag);
                return (
                  <Pressable
                    key={tag}
                    disabled={busy}
                    onPress={() => void onToggleTag(tag)}
                    style={[styles.tagChip, active && styles.tagChipActive]}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>
                      {RECRUITER_TAG_LABELS[tag]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {role === "RECRUITER" && notes.length > 0 ? (
          <View style={styles.notesBlock}>
            <Text style={styles.messageLabel}>Histórico de notas</Text>
            {notes.map((entry) => (
              <View key={entry.id} style={styles.noteEntry}>
                <Text style={styles.noteMeta}>
                  {NOTE_ACTION_LABELS[entry.action]} · {relativeTime(entry.createdAt)}
                </Text>
                <Text style={styles.messageBody}>{entry.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {role === "RECRUITER" && item.recruiterNote && notes.length === 0 && !canTriage ? (
          <View style={styles.noteBox}>
            <Text style={styles.messageLabel}>Sua nota interna</Text>
            <Text style={styles.messageBody}>{item.recruiterNote}</Text>
          </View>
        ) : null}

        {item.decisionMessage && (role === "EMPLOYER" || role === "CANDIDATE") ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>
              {role === "EMPLOYER" ? "Mensagem registrada" : "Mensagem do processo"}
            </Text>
            <Text style={styles.messageBody}>{item.decisionMessage}</Text>
          </View>
        ) : null}

        {showInterviewBlock ? (
          <View style={styles.interviewBlock}>
            <Text style={styles.actionsTitle}>Entrevista</Text>
            {(role === "EMPLOYER" || role === "RECRUITER") && candidateEmailForInterview ? (
              <Text style={styles.meta}>Candidato: {candidateEmailForInterview}</Text>
            ) : null}

            {currentInterview ? (
              <View style={styles.interviewCurrent}>
                <Text style={styles.messageLabel}>
                  {INTERVIEW_STATUS_LABELS[currentInterview.status]}
                </Text>
                <Text style={styles.messageBody}>
                  {formatInterviewWhen(currentInterview.scheduledAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.meta}>Nenhuma data marcada ainda.</Text>
            )}

            {interviews.length > 0 ? (
              <View style={styles.interviewHistory}>
                <Text style={styles.messageLabel}>Histórico</Text>
                {interviews.map((entry) => (
                  <View key={entry.id} style={styles.noteEntry}>
                    <Text style={styles.noteMeta}>
                      {INTERVIEW_STATUS_LABELS[entry.status]} ·{" "}
                      {formatInterviewWhen(entry.scheduledAt)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {canSchedule ? (
              <View style={styles.scheduleForm}>
                <Text style={styles.fieldLabel}>Dia (DD/MM/AAAA)</Text>
                <TextInput
                  value={interviewDate}
                  onChangeText={setInterviewDate}
                  placeholder="31/10/2026"
                  placeholderTextColor={colors.muted}
                  style={styles.scheduleInput}
                  editable={!busy}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.fieldLabel}>Hora (HH:MM)</Text>
                <TextInput
                  value={interviewTime}
                  onChangeText={setInterviewTime}
                  placeholder="14:30"
                  placeholderTextColor={colors.muted}
                  style={styles.scheduleInput}
                  editable={!busy}
                  keyboardType="numbers-and-punctuation"
                />
                <PrimaryButton
                  label={
                    currentInterview?.status === "PROPOSED"
                      ? "Atualizar data"
                      : interviews.some((entry) => entry.status === "DECLINED")
                        ? "Marcar outro dia"
                        : "Marcar entrevista"
                  }
                  onPress={() => void onProposeInterview()}
                  disabled={busy || interviewDate.trim().length === 0 || interviewTime.trim().length === 0}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {result ? (
          <DossierAnalysis result={result} role={role} />
        ) : (
          <Text style={styles.meta}>Análise ainda não disponível neste dossiê.</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {role === "RECRUITER" ? (
          <View style={styles.actions}>
            <Text style={styles.actionsTitle}>Nota interna</Text>
            <Text style={styles.fieldLabel}>Salvar sem mudar o status</Text>
            <TextInput
              value={freeNote}
              onChangeText={setFreeNote}
              placeholder="Só você vê este texto"
              placeholderTextColor={colors.muted}
              style={styles.input}
              editable={!busy}
              multiline
            />
            <PrimaryButton
              label="Salvar nota"
              onPress={() => void onSaveNote()}
              disabled={busy || freeNote.trim().length === 0}
              variant="secondary"
            />
          </View>
        ) : null}

        {canTriage ? (
          <View style={styles.actions}>
            <Text style={styles.actionsTitle}>Triagem</Text>
            <Text style={styles.fieldLabel}>Nota ao encaminhar ou descartar (opcional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Entra no histórico com a ação"
              placeholderTextColor={colors.muted}
              style={styles.input}
              editable={!busy}
              multiline
            />
            <PrimaryButton
              label="Encaminhar ao contratante"
              onPress={() => void onForward()}
              disabled={busy}
            />
            <PrimaryButton
              label="Descartar"
              onPress={() => void onDiscard()}
              disabled={busy}
              variant="secondary"
            />
          </View>
        ) : null}

        {canDecide ? (
          <View style={styles.actions}>
            <Text style={styles.actionsTitle}>Decisão</Text>
            <Text style={styles.fieldLabel}>
              Mensagem {pendingAction && pendingAction !== "ACCEPT" ? "(obrigatória)" : "(para recusa ou ajuste)"}
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Texto curto visível ao candidato"
              placeholderTextColor={colors.muted}
              style={styles.input}
              editable={!busy}
              multiline
            />
            <PrimaryButton
              label="Aceitar"
              onPress={() => void onDecide("ACCEPT")}
              disabled={busy}
            />
            <PrimaryButton
              label="Pedir ajuste"
              onPress={() => void onDecide("REQUEST_ADJUSTMENT")}
              disabled={busy}
              variant="secondary"
            />
            <PrimaryButton
              label="Recusar"
              onPress={() => void onDecide("REJECT")}
              disabled={busy}
              variant="ghost"
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  resubmitBadge: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.attention,
    backgroundColor: colors.attentionSoft,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  candidateEmail: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  jobBrief: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  jobDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  tagsBlock: {
    gap: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tagChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagChipActive: {
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.muted,
  },
  tagTextActive: {
    color: colors.accent,
  },
  notesBlock: {
    gap: spacing.sm,
  },
  noteEntry: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.input,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noteMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
  },
  messageBox: {
    backgroundColor: colors.attentionSoft,
    borderRadius: radius.input,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noteBox: {
    backgroundColor: colors.accentSoft,
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
  actions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  actionsTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.ink,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    minHeight: 88,
    textAlignVertical: "top",
  },
  interviewBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    padding: spacing.lg,
    gap: spacing.md,
  },
  interviewCurrent: {
    gap: spacing.xs,
  },
  interviewHistory: {
    gap: spacing.sm,
  },
  scheduleForm: {
    gap: spacing.sm,
  },
  scheduleInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    minHeight: 50,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
});
