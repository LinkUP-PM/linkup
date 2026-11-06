import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type {
  CandidateLanguage,
  HiringArea,
  JobContractType,
  JobSeniority,
  LanguageLevel,
  RecruiterProfile,
  RecruiterProfileInput,
  RecruiterWorkMode,
} from "@linkup/shared";
import {
  HIRING_AREA_LABELS,
  HIRING_AREAS,
  JOB_CONTRACT_TYPE_LABELS,
  JOB_CONTRACT_TYPES,
  JOB_SENIORITIES,
  JOB_SENIORITY_LABELS,
  LANGUAGE_LEVEL_LABELS,
  LANGUAGE_LEVELS,
  MAX_RECRUITER_CERTIFICATES,
  RECRUITER_WORK_MODE_LABELS,
  RECRUITER_WORK_MODES,
} from "@linkup/shared";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchableSelect } from "../../src/components/SearchableSelect";
import {
  BRAZIL_UFS,
  citiesForUf,
  ufOptionLabel,
} from "../../src/data/br-states";
import { getRecruiterProfile, updateRecruiterProfile } from "../../src/lib/api";
import { formatBrazilPhone, phoneDigits } from "../../src/lib/phone";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

const UF_OPTIONS = BRAZIL_UFS.map((uf) => ({
  value: uf,
  label: ufOptionLabel(uf),
}));

const STEPS = ["Pessoal", "Atuação", "Especialidade"] as const;

type Draft = {
  fullName: string;
  headline: string;
  phone: string;
  linkedinUrl: string;
  state: string;
  city: string;
  bio: string;
  workMode: RecruiterWorkMode | null;
  consultancyName: string;
  consultancyWebsite: string;
  yearsExperience: string;
  availability: string;
  focusAreas: HiringArea[];
  seniorities: JobSeniority[];
  contractTypes: JobContractType[];
  languages: Array<Omit<CandidateLanguage, "id">>;
  certificatesText: string;
};

function profileToDraft(profile: RecruiterProfile): Draft {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    phone: formatBrazilPhone(profile.phone),
    linkedinUrl: profile.linkedinUrl ?? "",
    state: profile.state,
    city: profile.city,
    bio: profile.bio ?? "",
    workMode: profile.workMode,
    consultancyName: profile.consultancyName ?? "",
    consultancyWebsite: profile.consultancyWebsite ?? "",
    yearsExperience: profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    availability: profile.availability ?? "",
    focusAreas: [...profile.focusAreas],
    seniorities: [...profile.seniorities],
    contractTypes: [...profile.contractTypes],
    languages: profile.languages.map(({ id: _id, ...rest }) => rest),
    certificatesText: profile.certificates.map((item) => item.title).join(", "),
  };
}

function draftToInput(draft: Draft): RecruiterProfileInput {
  const years = draft.yearsExperience.trim();
  return {
    fullName: draft.fullName,
    headline: draft.headline,
    phone: phoneDigits(draft.phone),
    linkedinUrl: draft.linkedinUrl || null,
    state: draft.state,
    city: draft.city,
    bio: draft.bio || null,
    workMode: draft.workMode,
    consultancyName: draft.consultancyName || null,
    consultancyWebsite: draft.consultancyWebsite || null,
    yearsExperience: years ? Number(years) : null,
    availability: draft.availability || null,
    focusAreas: draft.focusAreas,
    seniorities: draft.seniorities,
    contractTypes: draft.contractTypes,
    languages: draft.languages,
    certificates: draft.certificatesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_RECRUITER_CERTIFICATES)
      .map((title) => ({ title })),
  };
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address" | "url";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tertiary}
        style={[styles.input, multiline && styles.inputMultiline]}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function parseCadastroStep(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n >= STEPS.length) return null;
  return n;
}

export default function RecruiterCadastroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string | string[] }>();
  const initialStep = parseCadastroStep(params.step);
  const [step, setStep] = useState(initialStep ?? 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [langDraft, setLangDraft] = useState({ language: "", level: "INTERMEDIATE" as LanguageLevel });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecruiterProfile();
      setProfile(data);
      setDraft(profileToDraft(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o cadastro.");
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (initialStep != null) setStep(initialStep);
  }, [initialStep]);

  const progress = useMemo(() => `${step + 1} de ${STEPS.length}`, [step]);

  async function saveCurrent(): Promise<RecruiterProfile | null> {
    if (!draft) return null;
    setBusy(true);
    setError(null);
    try {
      const saved = await updateRecruiterProfile(draftToInput(draft));
      setProfile(saved);
      setDraft(profileToDraft(saved));
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    const saved = await saveCurrent();
    if (!saved) return;
    if (step >= STEPS.length - 1) {
      router.back();
      return;
    }
    setStep((value) => value + 1);
  }

  function addLanguage() {
    if (!draft) return;
    const language = langDraft.language.trim();
    if (language.length < 2) {
      setError("Informe o nome do idioma.");
      return;
    }
    setDraft({
      ...draft,
      languages: [...draft.languages, { language, level: langDraft.level }],
    });
    setLangDraft({ language: "", level: "INTERMEDIATE" });
    setError(null);
  }

  if (loading || !draft) {
    return <LoadingScreen message="Carregando cadastro…" />;
  }

  if (error && !profile) {
    return (
      <EmptyState
        title="Cadastro indisponível"
        body={error}
        actionLabel="Tentar de novo"
        onAction={() => void load()}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.progress}>
        Passo {progress} · {STEPS[step]}
      </Text>
      {profile?.isComplete ? (
        <Text style={styles.complete}>Perfil completo</Text>
      ) : (
        <Text style={styles.incomplete}>
          Complete dados pessoais e ao menos uma área de foco
        </Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 0 ? (
        <GroupedSection header="Dados pessoais">
          <View style={styles.pad}>
            <Field
              label="Nome completo"
              value={draft.fullName}
              onChangeText={(fullName) => setDraft({ ...draft, fullName })}
              placeholder="Como você se apresenta"
            />
            <Field
              label="Headline"
              value={draft.headline}
              onChangeText={(headline) => setDraft({ ...draft, headline })}
              placeholder="Ex.: Recrutador técnico | Engenharia e produto"
            />
            <Field
              label="Telefone"
              value={draft.phone}
              onChangeText={(phone) => setDraft({ ...draft, phone: formatBrazilPhone(phone) })}
              placeholder="(11) 9 9999-9999"
              keyboardType="phone-pad"
            />
            <Field
              label="LinkedIn"
              value={draft.linkedinUrl}
              onChangeText={(linkedinUrl) => setDraft({ ...draft, linkedinUrl })}
              placeholder="https://linkedin.com/in/..."
              keyboardType="url"
            />
            <SearchableSelect
              label="UF"
              value={draft.state}
              options={UF_OPTIONS}
              placeholder="Selecionar estado"
              onChange={(state) =>
                setDraft({
                  ...draft,
                  state,
                  city: citiesForUf(state).includes(draft.city) ? draft.city : "",
                })
              }
            />
            <SearchableSelect
              label="Cidade"
              value={draft.city}
              options={citiesForUf(draft.state).map((city) => ({
                value: city,
                label: city,
              }))}
              placeholder={draft.state ? "Selecionar ou digitar cidade" : "Escolha a UF primeiro"}
              disabled={!draft.state}
              emptyMessage={
                draft.state
                  ? "Nenhuma cidade encontrada. Ajuste a busca."
                  : "Selecione a UF para ver as cidades."
              }
              onChange={(city) => setDraft({ ...draft, city })}
            />
            <Field
              label="Bio"
              value={draft.bio}
              onChangeText={(bio) => setDraft({ ...draft, bio })}
              placeholder="Como você recruta e para quais times (mín. 40 caracteres)"
              multiline
            />
          </View>
        </GroupedSection>
      ) : null}

      {step === 1 ? (
        <GroupedSection header="Atuação">
          <View style={styles.pad}>
            <Text style={styles.fieldLabel}>Como trabalha</Text>
            <View style={styles.chips}>
              {RECRUITER_WORK_MODES.map((mode) => (
                <Chip
                  key={mode}
                  label={RECRUITER_WORK_MODE_LABELS[mode]}
                  selected={draft.workMode === mode}
                  onPress={() => setDraft({ ...draft, workMode: mode })}
                />
              ))}
            </View>
            <Field
              label="Nome da consultoria"
              value={draft.consultancyName}
              onChangeText={(consultancyName) => setDraft({ ...draft, consultancyName })}
              placeholder="Se atua por consultoria"
            />
            <Field
              label="Site da consultoria"
              value={draft.consultancyWebsite}
              onChangeText={(consultancyWebsite) => setDraft({ ...draft, consultancyWebsite })}
              placeholder="https://..."
              keyboardType="url"
            />
            <Field
              label="Anos de experiência"
              value={draft.yearsExperience}
              onChangeText={(yearsExperience) =>
                setDraft({
                  ...draft,
                  yearsExperience: yearsExperience.replace(/\D/g, "").slice(0, 2),
                })
              }
              placeholder="5"
              keyboardType="number-pad"
            />
            <Field
              label="Disponibilidade"
              value={draft.availability}
              onChangeText={(availability) => setDraft({ ...draft, availability })}
              placeholder="Ex.: Horário comercial, Brasília"
            />
          </View>
        </GroupedSection>
      ) : null}

      {step === 2 ? (
        <>
          <GroupedSection header="Especialidade">
            <View style={styles.pad}>
              <Text style={styles.fieldLabel}>Áreas de foco</Text>
              <View style={styles.chips}>
                {HIRING_AREAS.map((area) => (
                  <Chip
                    key={area}
                    label={HIRING_AREA_LABELS[area]}
                    selected={draft.focusAreas.includes(area)}
                    onPress={() =>
                      setDraft({ ...draft, focusAreas: toggleItem(draft.focusAreas, area) })
                    }
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Senioridades</Text>
              <View style={styles.chips}>
                {JOB_SENIORITIES.map((item) => (
                  <Chip
                    key={item}
                    label={JOB_SENIORITY_LABELS[item]}
                    selected={draft.seniorities.includes(item)}
                    onPress={() =>
                      setDraft({ ...draft, seniorities: toggleItem(draft.seniorities, item) })
                    }
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Tipos de contrato</Text>
              <View style={styles.chips}>
                {JOB_CONTRACT_TYPES.map((item) => (
                  <Chip
                    key={item}
                    label={JOB_CONTRACT_TYPE_LABELS[item]}
                    selected={draft.contractTypes.includes(item)}
                    onPress={() =>
                      setDraft({
                        ...draft,
                        contractTypes: toggleItem(draft.contractTypes, item),
                      })
                    }
                  />
                ))}
              </View>
              <Field
                label={`Certificações (até ${MAX_RECRUITER_CERTIFICATES}, separadas por vírgula)`}
                value={draft.certificatesText}
                onChangeText={(certificatesText) => setDraft({ ...draft, certificatesText })}
                placeholder="Ex.: LinkedIn Recruiter, Google Talent"
                multiline
              />
            </View>
          </GroupedSection>

          <GroupedSection header="Idiomas">
            <View style={styles.pad}>
              {draft.languages.map((item, index) => (
                <View key={`${item.language}-${index}`} style={styles.langRow}>
                  <Text style={styles.langText}>
                    {item.language} · {LANGUAGE_LEVEL_LABELS[item.level]}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setDraft({
                        ...draft,
                        languages: draft.languages.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Text style={styles.removeLink}>Remover</Text>
                  </Pressable>
                </View>
              ))}
              <Field
                label="Idioma"
                value={langDraft.language}
                onChangeText={(language) => setLangDraft({ ...langDraft, language })}
                placeholder="Ex.: Inglês"
              />
              <Text style={styles.fieldLabel}>Nível</Text>
              <View style={styles.chips}>
                {LANGUAGE_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={LANGUAGE_LEVEL_LABELS[level]}
                    selected={langDraft.level === level}
                    onPress={() => setLangDraft({ ...langDraft, level })}
                  />
                ))}
              </View>
              <PrimaryButton
                label="Adicionar idioma"
                variant="secondary"
                onPress={addLanguage}
                disabled={busy}
              />
            </View>
          </GroupedSection>
        </>
      ) : null}

      <View style={styles.footer}>
        {step > 0 ? (
          <PrimaryButton
            label="Voltar"
            variant="ghost"
            onPress={() => setStep((value) => value - 1)}
            disabled={busy}
          />
        ) : null}
        <PrimaryButton
          label={step === STEPS.length - 1 ? "Salvar e concluir" : "Salvar e continuar"}
          onPress={() => void next()}
          disabled={busy}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.tabBarClearance + spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  progress: {
    ...type.caption1,
    color: colors.muted,
  },
  complete: {
    ...type.caption1,
    color: colors.strengths,
    fontFamily: fonts.bodySemi,
  },
  incomplete: {
    ...type.caption1,
    color: colors.attention,
  },
  error: {
    ...type.caption1,
    color: colors.error,
  },
  pad: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...type.caption1,
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...type.caption1,
    color: colors.muted,
  },
  chipLabelSelected: {
    color: colors.accent,
    fontFamily: fonts.bodySemi,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  langText: {
    ...type.body,
    color: colors.ink,
    flex: 1,
  },
  removeLink: {
    ...type.caption1,
    color: colors.error,
    fontFamily: fonts.bodySemi,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
