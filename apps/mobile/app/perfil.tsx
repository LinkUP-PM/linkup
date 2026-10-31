import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { Resume } from "@linkup/shared";
import { MAX_FOCUSED_RESUMES } from "@linkup/shared";
import { BrandLogo, brandLogoSizes } from "../src/components/BrandLogo";
import { EmptyState } from "../src/components/EmptyState";
import { GroupedSection } from "../src/components/GroupedSection";
import { ListRow } from "../src/components/ListRow";
import { PrimaryButton } from "../src/components/PrimaryButton";
import {
  createResume,
  deleteResume,
  listResumes,
  renameResume,
  replaceResumeFile,
} from "../src/lib/api";
import { pickPdf } from "../src/lib/pick-pdf";
import { colors, fonts, radius, spacing, type } from "../src/theme/tokens";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PerfilScreen() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResumes(await listResumes());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil.");
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const main = resumes.find((r) => r.kind === "MAIN") ?? null;
  const focused = resumes.filter((r) => r.kind === "FOCUSED");

  async function addMain() {
    setError(null);
    let file: Awaited<ReturnType<typeof pickPdf>>;
    try {
      file = await pickPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o seletor.");
      return;
    }
    if (!file) return;
    setBusy(true);
    try {
      await createResume({ kind: "MAIN", input: file });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o currículo.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceFile(resumeId: string) {
    setError(null);
    let file: Awaited<ReturnType<typeof pickPdf>>;
    try {
      file = await pickPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o seletor.");
      return;
    }
    if (!file) return;
    setBusy(true);
    try {
      await replaceResumeFile(resumeId, file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível substituir o PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function addFocused() {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      setError("Dê um nome curto à versão (área ou empresa).");
      return;
    }
    setError(null);
    let file: Awaited<ReturnType<typeof pickPdf>>;
    try {
      file = await pickPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o seletor.");
      return;
    }
    if (!file) return;
    setBusy(true);
    try {
      await createResume({ kind: "FOCUSED", label: trimmed, input: file });
      setNaming(false);
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a versão.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRename() {
    if (!renameId) return;
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      setError("Dê um nome curto à versão (área ou empresa).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameResume(renameId, trimmed);
      setRenameId(null);
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível renomear.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(item: Resume) {
    Alert.alert(
      "Remover currículo",
      `Remover “${item.label}” deste aparelho?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await deleteResume(item.id);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível remover.");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!main && focused.length === 0 && !naming) {
    return (
      <View style={styles.flex}>
        <EmptyState
          brand
          title="Seus currículos"
          body="Salve 1 principal e até 3 versões para uma área ou empresa. Depois é só encaminhar na vaga."
          actionLabel="Adicionar currículo principal"
          onAction={() => void addMain()}
        />
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        1 principal e até {MAX_FOCUSED_RESUMES} versões. Na vaga você escolhe qual encaminhar.
      </Text>

      <GroupedSection header="Principal">
        {main ? (
          <View>
            <ListRow
              title={main.label}
              subtitle={main.fileName}
              meta={formatBytes(main.fileSizeBytes)}
              showChevron={false}
            />
            <View style={styles.actions}>
              <Pressable onPress={() => void replaceFile(main.id)} disabled={busy}>
                <Text style={styles.link}>Substituir PDF</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(main)} disabled={busy}>
                <Text style={styles.danger}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.pad}>
            <PrimaryButton
              label="Adicionar principal"
              onPress={() => void addMain()}
              disabled={busy}
            />
          </View>
        )}
      </GroupedSection>

      <GroupedSection
        header="Para uma área ou empresa"
        footer={
          focused.length >= MAX_FOCUSED_RESUMES
            ? `Limite de ${MAX_FOCUSED_RESUMES} versões atingido.`
            : undefined
        }
      >
        {focused.map((item) => (
          <View key={item.id}>
            <ListRow
              title={item.label}
              subtitle={item.fileName}
              meta={formatBytes(item.fileSizeBytes)}
              showChevron={false}
            />
            <View style={styles.actions}>
              <Pressable onPress={() => void replaceFile(item.id)} disabled={busy}>
                <Text style={styles.link}>Substituir</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setRenameId(item.id);
                  setNaming(false);
                  setLabel(item.label);
                }}
                disabled={busy}
              >
                <Text style={styles.link}>Renomear</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} disabled={busy}>
                <Text style={styles.danger}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {naming ? (
          <View style={styles.pad}>
            <Text style={styles.fieldLabel}>Nome da versão</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Ex.: Dados, Empresa X"
              placeholderTextColor={colors.tertiary}
              style={styles.input}
              editable={!busy}
              maxLength={40}
            />
            <PrimaryButton
              label="Escolher PDF"
              onPress={() => void addFocused()}
              disabled={busy || label.trim().length < 2}
            />
            <PrimaryButton
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setNaming(false);
                setLabel("");
              }}
              disabled={busy}
            />
          </View>
        ) : renameId ? (
          <View style={styles.pad}>
            <Text style={styles.fieldLabel}>Novo nome</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Ex.: Dados, Empresa X"
              placeholderTextColor={colors.tertiary}
              style={styles.input}
              editable={!busy}
              maxLength={40}
            />
            <PrimaryButton
              label="Salvar nome"
              onPress={() => void confirmRename()}
              disabled={busy || label.trim().length < 2}
            />
            <PrimaryButton
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setRenameId(null);
                setLabel("");
              }}
              disabled={busy}
            />
          </View>
        ) : focused.length < MAX_FOCUSED_RESUMES ? (
          <View style={styles.pad}>
            <PrimaryButton
              label="Adicionar versão"
              variant="secondary"
              onPress={() => {
                setNaming(true);
                setRenameId(null);
                setLabel("");
              }}
              disabled={busy}
            />
          </View>
        ) : null}
      </GroupedSection>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <BrandLogo
        variant="wordmark"
        width={brandLogoSizes.footer}
        style={styles.footerBrand}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  intro: {
    ...type.footnote,
    color: colors.muted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  pad: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  link: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.accent,
  },
  danger: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.error,
  },
  fieldLabel: {
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
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    marginHorizontal: spacing.lg,
    lineHeight: 20,
  },
  errorBanner: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    padding: spacing.lg,
  },
  footerBrand: {
    alignSelf: "center",
    marginTop: spacing.xxl,
    opacity: 0.85,
  },
});
