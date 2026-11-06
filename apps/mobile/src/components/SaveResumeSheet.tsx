import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Resume } from "@linkup/shared";
import { MAX_FOCUSED_RESUMES } from "@linkup/shared";
import { listResumes, savePickedPdfToLibrary, type UploadFileInput } from "../lib/api";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  visible: boolean;
  file: UploadFileInput | null;
  onSkip: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function SaveResumeSheet({ visible, file, onSkip, onSaved, onError }: Props) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!visible) {
      setNaming(false);
      setReplaceId(null);
      setLabel("");
      setBusy(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listResumes()
      .then((items) => {
        if (!cancelled) setResumes(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : "Não foi possível carregar o perfil.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, onError]);

  const main = useMemo(() => resumes.find((r) => r.kind === "MAIN") ?? null, [resumes]);
  const focused = useMemo(() => resumes.filter((r) => r.kind === "FOCUSED"), [resumes]);
  const focusedFull = focused.length >= MAX_FOCUSED_RESUMES;

  async function runSave(target: "MAIN" | "NEW_FOCUSED" | { replaceId: string }, nextLabel?: string) {
    if (!file || busy) return;
    setBusy(true);
    try {
      await savePickedPdfToLibrary({
        input: file,
        target,
        label: nextLabel,
      });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Não foi possível salvar o currículo.");
    } finally {
      setBusy(false);
    }
  }

  function confirmNamed() {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      onError("Dê um nome curto à versão (área ou empresa).");
      return;
    }
    if (replaceId) {
      void runSave({ replaceId }, trimmed);
    } else {
      void runSave("NEW_FOCUSED", trimmed);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={styles.scrim}>
        <Pressable style={styles.dismiss} onPress={onSkip} disabled={busy} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Salvar no perfil?</Text>
          <Text style={styles.body}>
            Guarde este PDF para encaminhar às vagas. A análise ou o reenvio seguem em qualquer caso.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : naming ? (
            <View style={styles.naming}>
              <Text style={styles.label}>Nome da versão</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Ex.: Dados, Empresa X"
                placeholderTextColor={colors.tertiary}
                style={styles.input}
                editable={!busy}
                autoFocus
                maxLength={40}
              />
              <PrimaryButton
                label={busy ? "Salvando…" : "Salvar versão"}
                onPress={confirmNamed}
                disabled={busy || label.trim().length < 2}
              />
              <PrimaryButton
                label="Voltar"
                variant="ghost"
                onPress={() => {
                  setNaming(false);
                  setReplaceId(null);
                  setLabel("");
                }}
                disabled={busy}
              />
            </View>
          ) : (
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              <PrimaryButton
                label={main ? "Substituir o principal" : "Salvar como principal"}
                onPress={() => void runSave("MAIN")}
                disabled={busy}
                style={styles.option}
              />

              {!focusedFull ? (
                <PrimaryButton
                  label="Salvar como versão"
                  variant="secondary"
                  onPress={() => {
                    setReplaceId(null);
                    setLabel("");
                    setNaming(true);
                  }}
                  disabled={busy}
                  style={styles.option}
                />
              ) : (
                <View style={styles.replaceBlock}>
                  <Text style={styles.replaceHint}>
                    Você já tem {MAX_FOCUSED_RESUMES} versões. Escolha qual substituir:
                  </Text>
                  {focused.map((item) => (
                    <PrimaryButton
                      key={item.id}
                      label={`Substituir “${item.label}”`}
                      variant="secondary"
                      onPress={() => {
                        setReplaceId(item.id);
                        setLabel(item.label);
                        setNaming(true);
                      }}
                      disabled={busy}
                      style={styles.option}
                    />
                  ))}
                </View>
              )}

              <PrimaryButton
                label="Não salvar"
                variant="ghost"
                onPress={onSkip}
                disabled={busy}
                style={styles.option}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.scrim,
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.group,
    borderTopRightRadius: radius.group,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "78%",
    gap: spacing.md,
  },
  title: {
    ...type.title3,
    color: colors.ink,
  },
  body: {
    ...type.footnote,
    color: colors.muted,
    lineHeight: 20,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
  options: {
    maxHeight: 360,
  },
  option: {
    marginBottom: spacing.sm,
  },
  naming: {
    gap: spacing.md,
  },
  label: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  replaceBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  replaceHint: {
    ...type.footnote,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
});
