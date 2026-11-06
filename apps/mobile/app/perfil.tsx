import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Sharing from "expo-sharing";
import type { CandidateProfile, Me, Resume } from "@linkup/shared";
import {
  LANGUAGE_LEVEL_LABELS,
  MAX_FOCUSED_RESUMES,
  WORK_MODEL_LABELS,
  candidateProfileStrength,
  type CandidateProfileStrengthDestination,
} from "@linkup/shared";
import { BrandLogo, brandLogoSizes } from "../src/components/BrandLogo";
import { CandidateProfileSummaryCard } from "../src/components/CandidateProfileSummaryCard";
import { EmptyState } from "../src/components/EmptyState";
import { GroupedSection } from "../src/components/GroupedSection";
import { ListRow } from "../src/components/ListRow";
import { PrimaryButton } from "../src/components/PrimaryButton";
import {
  createResume,
  deleteResume,
  getCandidateProfile,
  getMe,
  getResumeFileUri,
  listResumes,
  logout,
  renameResume,
  replaceResumeFile,
} from "../src/lib/api";
import { toProfileSummary } from "../src/lib/candidate-profile";
import { formatBrazilMoneyFromReais } from "../src/lib/money";
import { pickPdf } from "../src/lib/pick-pdf";
import { colors, fonts, radius, spacing, type } from "../src/theme/tokens";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function cadastroHref(step?: number): Href {
  if (step == null) return "/(candidate)/cadastro" as Href;
  return `/(candidate)/cadastro?step=${step}` as Href;
}

export default function PerfilScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
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
      const user = await getMe();
      setMe(user);
      const [resumeList, candidateProfile] = await Promise.all([
        user.role === "CANDIDATE" ? listResumes() : Promise.resolve([]),
        user.role === "CANDIDATE" ? getCandidateProfile() : Promise.resolve(null),
      ]);
      setResumes(resumeList);
      setProfile(candidateProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil.");
      setResumes([]);
      setProfile(null);
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
  const isCandidate = me?.role === "CANDIDATE";

  const strength = useMemo(
    () => candidateProfileStrength(profile, Boolean(main)),
    [profile, main],
  );
  const summary = useMemo(() => toProfileSummary(profile), [profile]);
  const previewSkills = profile?.skills.slice(0, 8) ?? [];

  function openCadastro(step?: number) {
    router.push(cadastroHref(step));
  }

  function onStrengthPress(destination: CandidateProfileStrengthDestination) {
    if (destination === "resume") {
      if (!main) void addMain();
      return;
    }
    openCadastro(destination);
  }

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

  async function openPdf(resumeId: string) {
    setError(null);
    setBusy(true);
    try {
      const { uri } = await getResumeFileUri(resumeId);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setError("Abrir PDF não está disponível neste aparelho.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Abrir currículo",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o PDF.");
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

  async function onLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace("/porta" as Href);
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

  const location =
    profile?.city && profile?.state
      ? `${profile.city}/${profile.state}`
      : profile?.city || profile?.state || null;

  const workModelLabel = profile?.workModel ? WORK_MODEL_LABELS[profile.workModel] : null;
  const salaryLabel =
    profile?.salaryExpectation != null
      ? formatBrazilMoneyFromReais(profile.salaryExpectation)
      : null;
  const languagesLabel =
    profile && profile.languages.length > 0
      ? profile.languages
          .map((lang) => `${lang.language} (${LANGUAGE_LEVEL_LABELS[lang.level]})`)
          .join(" · ")
      : null;

  const strengthPercent =
    strength.total > 0 ? Math.round((strength.done / strength.total) * 100) : 0;
  const incompleteItems = strength.items.filter((item) => !item.done);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {isCandidate ? (
        <>
          <GroupedSection header="Identidade">
            <ListRow
              title={profile?.fullName?.trim() || "Completar cadastro"}
              subtitle={
                [location, profile?.objective?.trim()].filter(Boolean).join(" · ") ||
                "Nome, cidade e objetivo profissional"
              }
              onPress={() => openCadastro()}
            />
          </GroupedSection>

          <GroupedSection
            header="Força do perfil"
            footer={
              strength.done < strength.total
                ? "Toque em uma lacuna para completar."
                : incompleteItems.length > 0
                  ? "Perfil completo. Experiência é opcional (primeiro emprego)."
                  : "Perfil pronto para candidaturas."
            }
          >
            <View style={styles.strengthPad}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthScore}>
                  {strength.done} de {strength.total}
                </Text>
                <Text style={styles.strengthPercent}>{strengthPercent}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${strengthPercent}%` }]} />
              </View>
            </View>
            {incompleteItems.map((item) => (
              <ListRow
                key={item.id}
                title={item.label}
                subtitle={item.required ? "Pendente" : "Recomendado"}
                onPress={() => onStrengthPress(item.destination)}
              />
            ))}
            {incompleteItems.length === 0 ? (
              <ListRow
                title="Tudo preenchido"
                subtitle="Incluindo recomendações opcionais"
                showChevron={false}
              />
            ) : null}
          </GroupedSection>

          <GroupedSection
            header="Como o recrutador vê"
            footer="Pretensão, telefone, laudo e diversidade não entram neste resumo."
          >
            {summary ? (
              <View style={styles.previewPad}>
                <CandidateProfileSummaryCard profile={summary} email={me?.email} />
                {previewSkills.length > 0 ? (
                  <View style={styles.skillWrap}>
                    {previewSkills.map((skill) => (
                      <View key={skill} style={styles.skillChip}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.previewHint}>
                    Sem habilidades ainda — adicione pelo menos 3 na trajetória.
                  </Text>
                )}
              </View>
            ) : (
              <ListRow
                title="Pré-visualização indisponível"
                subtitle="Preencha nome e dados básicos no cadastro"
                onPress={() => openCadastro(0)}
              />
            )}
          </GroupedSection>

          <GroupedSection header="Preferências de trabalho">
            <ListRow
              title="Modelo de trabalho"
              subtitle={workModelLabel ?? "Não informado"}
              onPress={() => openCadastro(2)}
            />
            <ListRow
              title="Pretensão salarial"
              subtitle={salaryLabel ?? "Não informada"}
              onPress={() => openCadastro(2)}
            />
            <ListRow
              title="Disponibilidade"
              subtitle={profile?.availability?.trim() || "Não informada"}
              onPress={() => openCadastro(2)}
            />
            <ListRow
              title="LinkedIn"
              subtitle={profile?.linkedinUrl?.trim() || "Não informado"}
              onPress={() => openCadastro(0)}
            />
            <ListRow
              title="Idiomas"
              subtitle={languagesLabel ?? "Nenhum idioma informado"}
              onPress={() => openCadastro(3)}
            />
          </GroupedSection>
        </>
      ) : null}

      {!main && focused.length === 0 && !naming ? (
        <EmptyState
          brand
          title="Seus currículos"
          body="Salve 1 principal e até 3 versões para uma área ou empresa. Depois é só encaminhar na vaga."
          actionLabel="Adicionar currículo principal"
          onAction={() => void addMain()}
        />
      ) : (
        <>
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
                  <Pressable onPress={() => void openPdf(main.id)} disabled={busy}>
                    <Text style={styles.link}>Abrir PDF</Text>
                  </Pressable>
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
                  <Pressable onPress={() => void openPdf(item.id)} disabled={busy}>
                    <Text style={styles.link}>Abrir</Text>
                  </Pressable>
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
        </>
      )}

      {isCandidate || me ? (
        <GroupedSection header="Conta">
          <ListRow title="E-mail" subtitle={me?.email ?? "—"} showChevron={false} />
          <View style={styles.pad}>
            <PrimaryButton
              label="Sair"
              variant="danger"
              onPress={() => void onLogout()}
              disabled={busy}
            />
          </View>
        </GroupedSection>
      ) : null}

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
  strengthPad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  strengthHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  strengthScore: {
    ...type.body,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  strengthPercent: {
    ...type.footnote,
    color: colors.muted,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  previewPad: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  previewHint: {
    ...type.footnote,
    color: colors.muted,
    lineHeight: 18,
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skillChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skillText: {
    ...type.caption1,
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
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
  footerBrand: {
    alignSelf: "center",
    marginTop: spacing.xxl,
    opacity: 0.85,
  },
});
