import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type {
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateCertificate,
  CandidateProfile,
  CandidateProfileInput,
  DisabilityStatus,
  EducationLevel,
  LanguageLevel,
  WorkModel,
} from "@linkup/shared";
import {
  DISABILITY_STATUS_LABELS,
  DISABILITY_STATUSES,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_LEVELS,
  LANGUAGE_LEVEL_LABELS,
  LANGUAGE_LEVELS,
  MAX_CANDIDATE_SKILLS,
  WORK_MODEL_LABELS,
  WORK_MODELS,
} from "@linkup/shared";
import { BirthDatePicker } from "../../src/components/BirthDatePicker";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { MonthYearPicker } from "../../src/components/MonthYearPicker";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchableSelect } from "../../src/components/SearchableSelect";
import {
  BRAZIL_UFS,
  citiesForUf,
  ufOptionLabel,
} from "../../src/data/br-states";
import {
  deleteCandidateLaudo,
  getCandidateProfile,
  updateCandidateProfile,
  uploadCandidateLaudo,
} from "../../src/lib/api";
import { cepDigits, formatBrazilCep } from "../../src/lib/cep";
import {
  formatBrazilMoneyFromReais,
  formatBrazilMoneyInput,
  parseBrazilMoneyToReais,
} from "../../src/lib/money";
import { formatBrazilPhone, phoneDigits } from "../../src/lib/phone";
import { pickPdf } from "../../src/lib/pick-pdf";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

const UF_OPTIONS = BRAZIL_UFS.map((uf) => ({
  value: uf,
  label: ufOptionLabel(uf),
}));

const AVAILABILITY_OPTIONS = [
  "Imediato",
  "15 dias",
  "30 dias",
  "60 dias",
  "A combinar",
] as const;

const STEPS = ["Pessoal", "Endereço", "Profissional", "Trajetória", "Diversidade"] as const;

type Draft = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  linkedinUrl: string;
  disabilityStatus: DisabilityStatus;
  disabilityDetail: string;
  disabilityCid: string;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
  objective: string;
  salaryExpectation: string;
  workModel: WorkModel | null;
  availability: string;
  skillsText: string;
  educations: Array<Omit<CandidateEducation, "id">>;
  experiences: Array<Omit<CandidateExperience, "id">>;
  languages: Array<Omit<CandidateLanguage, "id">>;
  certificates: Array<Omit<CandidateCertificate, "id">>;
  diversityPronoun: string;
  diversityGenderIdentity: string;
  diversityOrientation: string;
  diversityRace: string;
  diversityOriginCity: string;
  diversityShareConsent: boolean;
};

function profileToDraft(profile: CandidateProfile): Draft {
  return {
    fullName: profile.fullName,
    phone: formatBrazilPhone(profile.phone),
    birthDate: profile.birthDate,
    gender: profile.gender,
    linkedinUrl: profile.linkedinUrl ?? "",
    disabilityStatus: profile.disabilityStatus,
    disabilityDetail: profile.disabilityDetail ?? "",
    disabilityCid: profile.disabilityCid ?? "",
    livesInBrazil: profile.livesInBrazil,
    cep: formatBrazilCep(profile.cep),
    street: profile.street,
    state: profile.state,
    city: profile.city,
    objective: profile.objective ?? "",
    salaryExpectation: formatBrazilMoneyFromReais(profile.salaryExpectation),
    workModel: profile.workModel,
    availability: profile.availability ?? "",
    skillsText: profile.skills.join(", "),
    educations: profile.educations.map(({ id: _id, ...rest }) => rest),
    experiences: profile.experiences.map(({ id: _id, ...rest }) => rest),
    languages: profile.languages.map(({ id: _id, ...rest }) => rest),
    certificates: profile.certificates.map(({ id: _id, ...rest }) => rest),
    diversityPronoun: profile.diversityPronoun ?? "",
    diversityGenderIdentity: profile.diversityGenderIdentity ?? "",
    diversityOrientation: profile.diversityOrientation ?? "",
    diversityRace: profile.diversityRace ?? "",
    diversityOriginCity: profile.diversityOriginCity ?? "",
    diversityShareConsent: profile.diversityShareConsent,
  };
}

function draftToInput(draft: Draft): CandidateProfileInput {
  return {
    fullName: draft.fullName,
    phone: phoneDigits(draft.phone),
    birthDate: draft.birthDate,
    gender: draft.gender,
    linkedinUrl: draft.linkedinUrl || null,
    disabilityStatus: draft.disabilityStatus,
    disabilityDetail: draft.disabilityDetail || null,
    disabilityCid: draft.disabilityCid || null,
    livesInBrazil: draft.livesInBrazil,
    cep: cepDigits(draft.cep),
    street: draft.street,
    state: draft.state,
    city: draft.city,
    objective: draft.objective || null,
    salaryExpectation: parseBrazilMoneyToReais(draft.salaryExpectation),
    workModel: draft.workModel,
    availability: draft.availability || null,
    skills: draft.skillsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_CANDIDATE_SKILLS),
    educations: draft.educations,
    experiences: draft.experiences,
    languages: draft.languages,
    certificates: draft.certificates,
    diversityPronoun: draft.diversityPronoun || null,
    diversityGenderIdentity: draft.diversityGenderIdentity || null,
    diversityOrientation: draft.diversityOrientation || null,
    diversityRace: draft.diversityRace || null,
    diversityOriginCity: draft.diversityOriginCity || null,
    diversityShareConsent: draft.diversityShareConsent,
  };
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

function parseCadastroStep(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n >= STEPS.length) return null;
  return n;
}

export default function CandidateCadastroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string | string[] }>();
  const initialStep = parseCadastroStep(params.step);
  const [step, setStep] = useState(initialStep ?? 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCandidateProfile();
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

  async function saveCurrent(): Promise<CandidateProfile | null> {
    if (!draft) return null;
    setBusy(true);
    setError(null);
    try {
      const saved = await updateCandidateProfile(draftToInput(draft));
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

  async function attachLaudo() {
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
      const saved = await updateCandidateProfile(draftToInput(draft!));
      const withLaudo = await uploadCandidateLaudo(file);
      setProfile(withLaudo);
      setDraft(profileToDraft({ ...saved, ...withLaudo }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível anexar o laudo.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLaudo() {
    setBusy(true);
    setError(null);
    try {
      const saved = await deleteCandidateLaudo();
      setProfile(saved);
      if (draft) setDraft({ ...draft });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o laudo.");
    } finally {
      setBusy(false);
    }
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
        <Text style={styles.complete}>Cadastro completo</Text>
      ) : (
        <Text style={styles.incomplete}>Complete pessoal e endereço para marcar como completo</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 0 ? (
        <GroupedSection header="Dados pessoais">
          <View style={styles.pad}>
            <Field
              label="Nome completo"
              value={draft.fullName}
              onChangeText={(fullName) => setDraft({ ...draft, fullName })}
              placeholder="Como aparece no currículo"
            />
            <Field
              label="Telefone"
              value={draft.phone}
              onChangeText={(phone) => setDraft({ ...draft, phone: formatBrazilPhone(phone) })}
              placeholder="(11) 9 9999-9999"
              keyboardType="phone-pad"
            />
            <BirthDatePicker
              label="Data de nascimento"
              value={draft.birthDate}
              onChange={(birthDate) => setDraft({ ...draft, birthDate })}
            />
            <Field
              label="Gênero"
              value={draft.gender}
              onChangeText={(gender) => setDraft({ ...draft, gender })}
              placeholder="Como você se identifica"
            />
            <Field
              label="LinkedIn (opcional)"
              value={draft.linkedinUrl}
              onChangeText={(linkedinUrl) => setDraft({ ...draft, linkedinUrl })}
              placeholder="https://linkedin.com/in/..."
              keyboardType="url"
            />
            <Text style={styles.fieldLabel}>Deficiência</Text>
            <View style={styles.chips}>
              {DISABILITY_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={DISABILITY_STATUS_LABELS[status]}
                  selected={draft.disabilityStatus === status}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      disabilityStatus: status,
                      disabilityDetail: status === "YES" ? draft.disabilityDetail : "",
                      disabilityCid: status === "YES" ? draft.disabilityCid : "",
                    })
                  }
                />
              ))}
            </View>
            {draft.disabilityStatus === "YES" ? (
              <>
                <Field
                  label="Descreva a deficiência"
                  value={draft.disabilityDetail}
                  onChangeText={(disabilityDetail) => setDraft({ ...draft, disabilityDetail })}
                />
                <Field
                  label="CID (opcional)"
                  value={draft.disabilityCid}
                  onChangeText={(disabilityCid) => setDraft({ ...draft, disabilityCid })}
                />
                <Text style={styles.fieldLabel}>Laudo PCD (PDF, opcional)</Text>
                {profile?.laudo ? (
                  <View style={styles.laudoBox}>
                    <Text style={styles.laudoName}>{profile.laudo.fileName}</Text>
                    <Text style={styles.laudoMeta}>{formatBytes(profile.laudo.fileSizeBytes)}</Text>
                    <View style={styles.rowActions}>
                      <PrimaryButton
                        label="Substituir"
                        variant="secondary"
                        onPress={() => void attachLaudo()}
                        disabled={busy}
                        style={styles.inlineButton}
                      />
                      <PrimaryButton
                        label="Remover"
                        variant="danger"
                        onPress={() => void removeLaudo()}
                        disabled={busy}
                        style={styles.inlineButton}
                      />
                    </View>
                  </View>
                ) : (
                  <PrimaryButton
                    label="Anexar laudo PDF"
                    variant="secondary"
                    onPress={() => void attachLaudo()}
                    disabled={busy}
                  />
                )}
              </>
            ) : null}
          </View>
        </GroupedSection>
      ) : null}

      {step === 1 ? (
        <GroupedSection header="Endereço">
          <View style={styles.pad}>
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Moro no Brasil</Text>
              <Switch
                value={draft.livesInBrazil}
                onValueChange={(livesInBrazil) => setDraft({ ...draft, livesInBrazil })}
                trackColor={{ true: colors.accent }}
              />
            </View>
            <Field
              label="CEP"
              value={draft.cep}
              onChangeText={(cep) => setDraft({ ...draft, cep: formatBrazilCep(cep) })}
              placeholder="00000-000"
              keyboardType="number-pad"
            />
            <Field
              label="Endereço"
              value={draft.street}
              onChangeText={(street) => setDraft({ ...draft, street })}
              placeholder="Rua, número, complemento"
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
          </View>
        </GroupedSection>
      ) : null}

      {step === 2 ? (
        <GroupedSection header="Objetivo e disponibilidade">
          <View style={styles.pad}>
            <Field
              label="Objetivo profissional"
              value={draft.objective}
              onChangeText={(objective) => setDraft({ ...draft, objective })}
              multiline
            />
            <Field
              label="Pretensão salarial (bruto mensal)"
              value={draft.salaryExpectation}
              onChangeText={(salaryExpectation) =>
                setDraft({ ...draft, salaryExpectation: formatBrazilMoneyInput(salaryExpectation) })
              }
              placeholder="R$ 0,00"
              keyboardType="number-pad"
            />
            <Text style={styles.fieldLabel}>Modelo de trabalho</Text>
            <View style={styles.chips}>
              {WORK_MODELS.map((model) => (
                <Chip
                  key={model}
                  label={WORK_MODEL_LABELS[model]}
                  selected={draft.workModel === model}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      workModel: draft.workModel === model ? null : model,
                    })
                  }
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Disponibilidade</Text>
            <View style={styles.chips}>
              {AVAILABILITY_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={draft.availability === option}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      availability: draft.availability === option ? "" : option,
                    })
                  }
                />
              ))}
            </View>
          </View>
        </GroupedSection>
      ) : null}

      {step === 3 ? (
        <>
          <GroupedSection header="Formação">
            <View style={styles.pad}>
              {draft.educations.map((item, index) => (
                <View key={`edu-${index}`} style={styles.cardBlock}>
                  <Text style={styles.fieldLabel}>Nível</Text>
                  <View style={styles.chips}>
                    {EDUCATION_LEVELS.map((level) => (
                      <Chip
                        key={level}
                        label={EDUCATION_LEVEL_LABELS[level]}
                        selected={item.level === level}
                        onPress={() => {
                          const educations = [...draft.educations];
                          educations[index] = { ...item, level: level as EducationLevel };
                          setDraft({ ...draft, educations });
                        }}
                      />
                    ))}
                  </View>
                  <Field
                    label="Curso"
                    value={item.course}
                    onChangeText={(course) => {
                      const educations = [...draft.educations];
                      educations[index] = { ...item, course };
                      setDraft({ ...draft, educations });
                    }}
                  />
                  <Field
                    label="Instituição"
                    value={item.institution}
                    onChangeText={(institution) => {
                      const educations = [...draft.educations];
                      educations[index] = { ...item, institution };
                      setDraft({ ...draft, educations });
                    }}
                  />
                  <MonthYearPicker
                    label="Início"
                    value={item.startMonth}
                    onChange={(startMonth) => {
                      const educations = [...draft.educations];
                      educations[index] = { ...item, startMonth };
                      setDraft({ ...draft, educations });
                    }}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.fieldLabel}>Cursando</Text>
                    <Switch
                      value={item.ongoing}
                      onValueChange={(ongoing) => {
                        const educations = [...draft.educations];
                        educations[index] = {
                          ...item,
                          ongoing,
                          endMonth: ongoing ? null : item.endMonth ?? "",
                        };
                        setDraft({ ...draft, educations });
                      }}
                      trackColor={{ true: colors.accent }}
                    />
                  </View>
                  {!item.ongoing ? (
                    <MonthYearPicker
                      label="Fim"
                      value={item.endMonth ?? ""}
                      onChange={(endMonth) => {
                        const educations = [...draft.educations];
                        educations[index] = { ...item, endMonth };
                        setDraft({ ...draft, educations });
                      }}
                    />
                  ) : null}
                  <PrimaryButton
                    label="Remover formação"
                    variant="danger"
                    onPress={() =>
                      setDraft({
                        ...draft,
                        educations: draft.educations.filter((_, i) => i !== index),
                      })
                    }
                  />
                </View>
              ))}
              <PrimaryButton
                label="Adicionar formação"
                variant="secondary"
                onPress={() =>
                  setDraft({
                    ...draft,
                    educations: [
                      ...draft.educations,
                      {
                        level: "UNDERGRADUATE",
                        course: "",
                        institution: "",
                        startMonth: "",
                        endMonth: "",
                        ongoing: false,
                      },
                    ],
                  })
                }
              />
            </View>
          </GroupedSection>

          <GroupedSection header="Experiência">
            <View style={styles.pad}>
              {draft.experiences.map((item, index) => (
                <View key={`exp-${index}`} style={styles.cardBlock}>
                  <Field
                    label="Empresa"
                    value={item.company}
                    onChangeText={(company) => {
                      const experiences = [...draft.experiences];
                      experiences[index] = { ...item, company };
                      setDraft({ ...draft, experiences });
                    }}
                  />
                  <Field
                    label="Cargo"
                    value={item.role}
                    onChangeText={(role) => {
                      const experiences = [...draft.experiences];
                      experiences[index] = { ...item, role };
                      setDraft({ ...draft, experiences });
                    }}
                  />
                  <MonthYearPicker
                    label="Início"
                    value={item.startMonth}
                    onChange={(startMonth) => {
                      const experiences = [...draft.experiences];
                      experiences[index] = { ...item, startMonth };
                      setDraft({ ...draft, experiences });
                    }}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.fieldLabel}>Trabalho atual</Text>
                    <Switch
                      value={item.current}
                      onValueChange={(current) => {
                        const experiences = [...draft.experiences];
                        experiences[index] = {
                          ...item,
                          current,
                          endMonth: current ? null : item.endMonth ?? "",
                        };
                        setDraft({ ...draft, experiences });
                      }}
                      trackColor={{ true: colors.accent }}
                    />
                  </View>
                  {!item.current ? (
                    <MonthYearPicker
                      label="Fim"
                      value={item.endMonth ?? ""}
                      onChange={(endMonth) => {
                        const experiences = [...draft.experiences];
                        experiences[index] = { ...item, endMonth };
                        setDraft({ ...draft, experiences });
                      }}
                    />
                  ) : null}
                  <Field
                    label="Descrição"
                    value={item.description}
                    onChangeText={(description) => {
                      const experiences = [...draft.experiences];
                      experiences[index] = { ...item, description };
                      setDraft({ ...draft, experiences });
                    }}
                    multiline
                  />
                  <PrimaryButton
                    label="Remover experiência"
                    variant="danger"
                    onPress={() =>
                      setDraft({
                        ...draft,
                        experiences: draft.experiences.filter((_, i) => i !== index),
                      })
                    }
                  />
                </View>
              ))}
              <PrimaryButton
                label="Adicionar experiência"
                variant="secondary"
                onPress={() =>
                  setDraft({
                    ...draft,
                    experiences: [
                      ...draft.experiences,
                      {
                        company: "",
                        role: "",
                        startMonth: "",
                        endMonth: "",
                        current: false,
                        description: "",
                      },
                    ],
                  })
                }
              />
            </View>
          </GroupedSection>

          <GroupedSection header="Idiomas, habilidades e certificados">
            <View style={styles.pad}>
              {draft.languages.map((item, index) => (
                <View key={`lang-${index}`} style={styles.cardBlock}>
                  <Field
                    label="Idioma"
                    value={item.language}
                    onChangeText={(language) => {
                      const languages = [...draft.languages];
                      languages[index] = { ...item, language };
                      setDraft({ ...draft, languages });
                    }}
                  />
                  <Text style={styles.fieldLabel}>Nível</Text>
                  <View style={styles.chips}>
                    {LANGUAGE_LEVELS.map((level) => (
                      <Chip
                        key={level}
                        label={LANGUAGE_LEVEL_LABELS[level]}
                        selected={item.level === level}
                        onPress={() => {
                          const languages = [...draft.languages];
                          languages[index] = { ...item, level: level as LanguageLevel };
                          setDraft({ ...draft, languages });
                        }}
                      />
                    ))}
                  </View>
                  <PrimaryButton
                    label="Remover idioma"
                    variant="danger"
                    onPress={() =>
                      setDraft({
                        ...draft,
                        languages: draft.languages.filter((_, i) => i !== index),
                      })
                    }
                  />
                </View>
              ))}
              <PrimaryButton
                label="Adicionar idioma"
                variant="secondary"
                onPress={() =>
                  setDraft({
                    ...draft,
                    languages: [...draft.languages, { language: "", level: "BASIC" }],
                  })
                }
              />
              <Field
                label={`Habilidades (até ${MAX_CANDIDATE_SKILLS}, separadas por vírgula)`}
                value={draft.skillsText}
                onChangeText={(skillsText) => setDraft({ ...draft, skillsText })}
                multiline
              />
              {draft.certificates.map((item, index) => (
                <View key={`cert-${index}`} style={styles.cardBlock}>
                  <Field
                    label="Certificado"
                    value={item.title}
                    onChangeText={(title) => {
                      const certificates = [...draft.certificates];
                      certificates[index] = { ...item, title };
                      setDraft({ ...draft, certificates });
                    }}
                  />
                  <Field
                    label="Descrição"
                    value={item.description}
                    onChangeText={(description) => {
                      const certificates = [...draft.certificates];
                      certificates[index] = { ...item, description };
                      setDraft({ ...draft, certificates });
                    }}
                    multiline
                  />
                  <PrimaryButton
                    label="Remover certificado"
                    variant="danger"
                    onPress={() =>
                      setDraft({
                        ...draft,
                        certificates: draft.certificates.filter((_, i) => i !== index),
                      })
                    }
                  />
                </View>
              ))}
              <PrimaryButton
                label="Adicionar certificado"
                variant="secondary"
                onPress={() =>
                  setDraft({
                    ...draft,
                    certificates: [...draft.certificates, { title: "", description: "" }],
                  })
                }
              />
            </View>
          </GroupedSection>
        </>
      ) : null}

      {step === 4 ? (
        <GroupedSection
          header="Diversidade"
          footer="Campos opcionais. Não aparecem para recrutador nem contratante."
        >
          <View style={styles.pad}>
            <Field
              label="Pronome"
              value={draft.diversityPronoun}
              onChangeText={(diversityPronoun) => setDraft({ ...draft, diversityPronoun })}
            />
            <Field
              label="Identidade de gênero"
              value={draft.diversityGenderIdentity}
              onChangeText={(diversityGenderIdentity) =>
                setDraft({ ...draft, diversityGenderIdentity })
              }
            />
            <Field
              label="Orientação sexual"
              value={draft.diversityOrientation}
              onChangeText={(diversityOrientation) =>
                setDraft({ ...draft, diversityOrientation })
              }
            />
            <Field
              label="Cor ou raça"
              value={draft.diversityRace}
              onChangeText={(diversityRace) => setDraft({ ...draft, diversityRace })}
            />
            <Field
              label="Cidade de origem"
              value={draft.diversityOriginCity}
              onChangeText={(diversityOriginCity) =>
                setDraft({ ...draft, diversityOriginCity })
              }
            />
            <View style={styles.switchRow}>
              <Text style={[styles.fieldLabel, styles.flex]}>
                Autorizo o uso desses dados em processos afirmativos
              </Text>
              <Switch
                value={draft.diversityShareConsent}
                onValueChange={(diversityShareConsent) =>
                  setDraft({ ...draft, diversityShareConsent })
                }
                trackColor={{ true: colors.accent }}
              />
            </View>
          </View>
        </GroupedSection>
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  cardBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    marginBottom: spacing.sm,
  },
  laudoBox: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceElevated,
  },
  laudoName: {
    ...type.body,
    color: colors.ink,
  },
  laudoMeta: {
    ...type.caption1,
    color: colors.muted,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inlineButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
