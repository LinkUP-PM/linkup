import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import type {
  Job,
  JobContractType,
  JobInput,
  JobSeniority,
  JobStage,
  WorkModel,
} from "@linkup/shared";
import {
  canPublishJob,
  DEFAULT_JOB_STAGES,
  JOB_BENEFIT_OPTIONS,
  JOB_CONTRACT_TYPE_LABELS,
  JOB_CONTRACT_TYPES,
  JOB_SENIORITY_LABELS,
  JOB_SENIORITIES,
  WORK_MODEL_LABELS,
  WORK_MODELS,
} from "@linkup/shared";
import { GroupedSection } from "../../src/components/GroupedSection";
import { JobPreview } from "../../src/components/JobPreview";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchableSelect } from "../../src/components/SearchableSelect";
import {
  BRAZIL_UFS,
  citiesForUf,
  ufOptionLabel,
} from "../../src/data/br-states";
import { createJob, getJob, updateJob } from "../../src/lib/api";
import {
  formatBrazilMoneyFromReais,
  formatBrazilMoneyInput,
  parseBrazilMoneyToReais,
} from "../../src/lib/money";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

const UF_OPTIONS = BRAZIL_UFS.map((uf) => ({
  value: uf,
  label: ufOptionLabel(uf),
}));

const STEPS = [
  "Detalhes",
  "Local",
  "A vaga",
  "Requisitos",
  "Oferta",
  "Etapas",
  "Revisão",
] as const;

type Draft = {
  title: string;
  seniority: JobSeniority | null;
  contractType: JobContractType | null;
  openings: string;
  pcdExclusive: boolean;
  workModel: WorkModel | null;
  city: string;
  state: string;
  description: string;
  responsibilities: string;
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  salaryMin: string;
  salaryMax: string;
  additionalInfo: string;
  stages: JobStage[];
};

function emptyDraft(): Draft {
  return {
    title: "",
    seniority: null,
    contractType: null,
    openings: "1",
    pcdExclusive: false,
    workModel: null,
    city: "",
    state: "",
    description: "",
    responsibilities: "",
    requirements: [],
    niceToHave: [],
    benefits: [],
    salaryMin: "",
    salaryMax: "",
    additionalInfo: "",
    stages: DEFAULT_JOB_STAGES.map((s) => ({ ...s })),
  };
}

function draftFromJob(job: Job): Draft {
  return {
    title: job.title,
    seniority: job.seniority,
    contractType: job.contractType,
    openings: String(job.openings || 1),
    pcdExclusive: job.pcdExclusive,
    workModel: job.workModel,
    city: job.city ?? "",
    state: job.state ?? "",
    description: job.description,
    responsibilities: job.responsibilities,
    requirements:
      job.requirements.length > 0
        ? job.requirements
        : job.lookingFor
          ? job.lookingFor
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    niceToHave: job.niceToHave,
    benefits: job.benefits,
    salaryMin: formatBrazilMoneyFromReais(job.salaryMin),
    salaryMax: formatBrazilMoneyFromReais(job.salaryMax),
    additionalInfo: job.additionalInfo,
    stages:
      job.stages.length > 0
        ? job.stages.map((s) => ({ ...s }))
        : DEFAULT_JOB_STAGES.map((s) => ({ ...s })),
  };
}

function toInput(draft: Draft, status: "DRAFT" | "PUBLISHED"): JobInput {
  const openings = Number(draft.openings) || 1;
  return {
    title: draft.title,
    description: draft.description,
    status,
    seniority: draft.seniority,
    contractType: draft.contractType,
    openings,
    pcdExclusive: draft.pcdExclusive,
    workModel: draft.workModel,
    city: draft.city || null,
    state: draft.state || null,
    responsibilities: draft.responsibilities,
    requirements: draft.requirements,
    niceToHave: draft.niceToHave,
    benefits: draft.benefits,
    salaryMin: parseBrazilMoneyToReais(draft.salaryMin),
    salaryMax: parseBrazilMoneyToReais(draft.salaryMax),
    additionalInfo: draft.additionalInfo,
    stages: draft.stages,
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
  multiline,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tertiary}
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
}

function StringListEditor({
  label,
  placeholder,
  items,
  onChange,
  editable,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  editable: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const next = draft.trim().replace(/\s+/g, " ");
    if (next.length < 2) return;
    if (items.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...items, next]);
    setDraft("");
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.listAddRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.tertiary}
          style={[styles.input, styles.listInput]}
          editable={editable}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable onPress={add} disabled={!editable || draft.trim().length < 2} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Adicionar</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.listItem}>
          <Text style={styles.listItemText}>• {item}</Text>
          {editable ? (
            <Pressable onPress={() => onChange(items.filter((x) => x !== item))}>
              <Text style={styles.removeText}>Remover</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function NewJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === "string" ? params.id : undefined;

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [jobId, setJobId] = useState<string | null>(editId ?? null);
  const [wasPublished, setWasPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!editId) {
      setDraft(emptyDraft());
      setJobId(null);
      setWasPublished(false);
      setStep(0);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const job = await getJob(editId);
      setDraft(draftFromJob(job));
      setJobId(job.id);
      setWasPublished(job.status === "PUBLISHED");
      setStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a vaga.");
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewJob = useMemo(() => {
    const input = toInput(draft, "DRAFT");
    return {
      title: input.title ?? "",
      description: input.description ?? "",
      lookingFor: (input.requirements ?? []).join("; "),
      seniority: input.seniority ?? null,
      contractType: input.contractType ?? null,
      openings: input.openings ?? 1,
      pcdExclusive: Boolean(input.pcdExclusive),
      workModel: input.workModel ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      responsibilities: input.responsibilities ?? "",
      requirements: input.requirements ?? [],
      niceToHave: input.niceToHave ?? [],
      benefits: input.benefits ?? [],
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      additionalInfo: input.additionalInfo ?? "",
      stages: input.stages ?? [],
    };
  }, [draft]);

  async function persist(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    setBusy(true);
    try {
      const input = toInput(draft, status);
      const saved = jobId ? await updateJob(jobId, input) : await createJob(input);
      setJobId(saved.id);
      if (status === "PUBLISHED") {
        setWasPublished(true);
        router.replace("/(employer)" as Href);
      } else if (!editId && saved.id) {
        router.setParams({ id: saved.id });
      }
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a vaga.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (draft.title.trim().length < 3) {
      setError("Informe um título com pelo menos 3 caracteres para salvar o rascunho.");
      return;
    }
    const saved = await persist("DRAFT");
    if (saved) setError(null);
  }

  async function publish() {
    const err = canPublishJob({
      title: draft.title,
      description: draft.description,
      workModel: draft.workModel,
      city: draft.city || null,
      state: draft.state || null,
      seniority: draft.seniority,
      contractType: draft.contractType,
      requirements: draft.requirements,
    });
    if (err) {
      setError(err);
      return;
    }
    await persist("PUBLISHED");
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.intro}>Carregando vaga…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          {wasPublished
            ? "Edite os detalhes e publique de novo quando estiver pronto."
            : "Preencha em passos curtos. Dá para salvar rascunho a qualquer momento."}
        </Text>

        <View style={styles.progressRow}>
          {STEPS.map((label, index) => (
            <View
              key={label}
              style={[styles.progressDot, index <= step && styles.progressDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepTitle}>
          {step + 1}. {STEPS[step]}
        </Text>

        {step === 0 ? (
          <GroupedSection header="Detalhes">
            <Field
              label="Título"
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              placeholder="Ex.: Desenvolvedor mobile"
              editable={!busy}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Senioridade</Text>
              <View style={styles.chips}>
                {JOB_SENIORITIES.map((value) => (
                  <Chip
                    key={value}
                    label={JOB_SENIORITY_LABELS[value]}
                    selected={draft.seniority === value}
                    onPress={() => setDraft({ ...draft, seniority: value })}
                  />
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Contrato</Text>
              <View style={styles.chips}>
                {JOB_CONTRACT_TYPES.map((value) => (
                  <Chip
                    key={value}
                    label={JOB_CONTRACT_TYPE_LABELS[value]}
                    selected={draft.contractType === value}
                    onPress={() => setDraft({ ...draft, contractType: value })}
                  />
                ))}
              </View>
            </View>
            <Field
              label="Posições"
              value={draft.openings}
              onChangeText={(openings) =>
                setDraft({ ...draft, openings: openings.replace(/\D/g, "").slice(0, 2) })
              }
              placeholder="1"
              keyboardType="number-pad"
              editable={!busy}
            />
            <View style={styles.field}>
              <Text style={styles.label}>PCD</Text>
              <View style={styles.chips}>
                <Chip
                  label="Aberta a todos"
                  selected={!draft.pcdExclusive}
                  onPress={() => setDraft({ ...draft, pcdExclusive: false })}
                />
                <Chip
                  label="Exclusiva PCD"
                  selected={draft.pcdExclusive}
                  onPress={() => setDraft({ ...draft, pcdExclusive: true })}
                />
              </View>
            </View>
          </GroupedSection>
        ) : null}

        {step === 1 ? (
          <GroupedSection header="Local">
            <View style={styles.field}>
              <Text style={styles.label}>Modalidade</Text>
              <View style={styles.chips}>
                {WORK_MODELS.map((value) => (
                  <Chip
                    key={value}
                    label={WORK_MODEL_LABELS[value]}
                    selected={draft.workModel === value}
                    onPress={() => setDraft({ ...draft, workModel: value })}
                  />
                ))}
              </View>
            </View>
            {draft.workModel === "ONSITE" || draft.workModel === "HYBRID" ? (
              <View style={styles.field}>
                <SearchableSelect
                  label="Estado"
                  value={draft.state}
                  options={UF_OPTIONS}
                  placeholder="Selecionar estado"
                  disabled={busy}
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
                  placeholder={
                    draft.state ? "Selecionar cidade" : "Escolha o estado primeiro"
                  }
                  disabled={busy || !draft.state}
                  emptyMessage={
                    draft.state
                      ? "Nenhuma cidade encontrada. Ajuste a busca."
                      : "Selecione o estado para ver as cidades."
                  }
                  onChange={(city) => setDraft({ ...draft, city })}
                />
              </View>
            ) : (
              <Text style={styles.hint}>
                Remoto e flexível não pedem cidade. O candidato vê a modalidade na vaga.
              </Text>
            )}
          </GroupedSection>
        ) : null}

        {step === 2 ? (
          <GroupedSection header="A vaga">
            <Field
              label="Contexto"
              value={draft.description}
              onChangeText={(description) => setDraft({ ...draft, description })}
              placeholder="Time, empresa, o que a pessoa vai construir…"
              multiline
              editable={!busy}
            />
            <Field
              label="Atribuições"
              value={draft.responsibilities}
              onChangeText={(responsibilities) => setDraft({ ...draft, responsibilities })}
              placeholder="Principais entregas e responsabilidades…"
              multiline
              editable={!busy}
            />
          </GroupedSection>
        ) : null}

        {step === 3 ? (
          <GroupedSection header="Requisitos">
            <StringListEditor
              label="Obrigatórios"
              placeholder="Ex.: React Native"
              items={draft.requirements}
              onChange={(requirements) => setDraft({ ...draft, requirements })}
              editable={!busy}
            />
            <StringListEditor
              label="Desejáveis"
              placeholder="Ex.: experiência com Expo"
              items={draft.niceToHave}
              onChange={(niceToHave) => setDraft({ ...draft, niceToHave })}
              editable={!busy}
            />
          </GroupedSection>
        ) : null}

        {step === 4 ? (
          <GroupedSection header="Oferta">
            <View style={styles.field}>
              <Text style={styles.label}>Benefícios</Text>
              <View style={styles.chips}>
                {JOB_BENEFIT_OPTIONS.map((benefit) => {
                  const selected = draft.benefits.includes(benefit);
                  return (
                    <Chip
                      key={benefit}
                      label={benefit}
                      selected={selected}
                      onPress={() =>
                        setDraft({
                          ...draft,
                          benefits: selected
                            ? draft.benefits.filter((b) => b !== benefit)
                            : [...draft.benefits, benefit],
                        })
                      }
                    />
                  );
                })}
              </View>
            </View>
            <Field
              label="Salário mínimo (opcional)"
              value={draft.salaryMin}
              onChangeText={(salaryMin) =>
                setDraft({ ...draft, salaryMin: formatBrazilMoneyInput(salaryMin) })
              }
              placeholder="R$ 0,00"
              keyboardType="number-pad"
              editable={!busy}
            />
            <Field
              label="Salário máximo (opcional)"
              value={draft.salaryMax}
              onChangeText={(salaryMax) =>
                setDraft({ ...draft, salaryMax: formatBrazilMoneyInput(salaryMax) })
              }
              placeholder="R$ 0,00"
              keyboardType="number-pad"
              editable={!busy}
            />
            <Field
              label="Informações adicionais"
              value={draft.additionalInfo}
              onChangeText={(additionalInfo) => setDraft({ ...draft, additionalInfo })}
              placeholder="Horário, diferenciais, o que mais quiser destacar…"
              multiline
              editable={!busy}
            />
          </GroupedSection>
        ) : null}

        {step === 5 ? (
          <GroupedSection header="Etapas">
            <Text style={styles.hint}>
              As quatro primeiras já refletem o funil do LinkUP. Você pode editar as notas ou
              acrescentar etapas informativas.
            </Text>
            {draft.stages.map((stage, index) => (
              <View key={`${index}-${stage.label}`} style={styles.stageCard}>
                <Field
                  label={`Etapa ${index + 1}`}
                  value={stage.label}
                  onChangeText={(label) => {
                    const stages = draft.stages.map((s, i) =>
                      i === index ? { ...s, label } : s,
                    );
                    setDraft({ ...draft, stages });
                  }}
                  editable={!busy}
                />
                <Field
                  label="Nota"
                  value={stage.note}
                  onChangeText={(note) => {
                    const stages = draft.stages.map((s, i) =>
                      i === index ? { ...s, note } : s,
                    );
                    setDraft({ ...draft, stages });
                  }}
                  multiline
                  editable={!busy}
                />
                {index >= 4 ? (
                  <Pressable
                    onPress={() =>
                      setDraft({
                        ...draft,
                        stages: draft.stages.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Text style={styles.removeText}>Remover etapa</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <PrimaryButton
              label="Adicionar etapa"
              variant="secondary"
              onPress={() =>
                setDraft({
                  ...draft,
                  stages: [...draft.stages, { label: "Nova etapa", note: "" }],
                })
              }
              disabled={busy || draft.stages.length >= 12}
              style={styles.inlineBtn}
            />
          </GroupedSection>
        ) : null}

        {step === 6 ? (
          <GroupedSection header="Como o candidato vê">
            <View style={styles.previewPad}>
              <JobPreview job={previewJob} />
            </View>
          </GroupedSection>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <PrimaryButton
              label="Voltar"
              variant="secondary"
              onPress={back}
              disabled={busy}
              style={styles.actionBtn}
            />
          ) : null}
          <PrimaryButton
            label="Salvar rascunho"
            variant="ghost"
            onPress={() => void saveDraft()}
            disabled={busy}
            style={styles.actionBtn}
          />
          {step < STEPS.length - 1 ? (
            <PrimaryButton
              label="Continuar"
              onPress={next}
              disabled={busy}
              style={styles.actionBtn}
            />
          ) : (
            <PrimaryButton
              label={wasPublished ? "Salvar e publicar" : "Publicar vaga"}
              onPress={() => void publish()}
              disabled={busy}
              style={styles.actionBtn}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.tabBarClearance,
    gap: spacing.md,
  },
  intro: {
    ...type.subhead,
    color: colors.muted,
    marginHorizontal: spacing.lg,
  },
  progressRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  stepTitle: {
    ...type.headline,
    color: colors.ink,
    marginHorizontal: spacing.lg,
  },
  field: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    ...type.body,
    color: colors.ink,
    paddingVertical: spacing.xs,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
  },
  chipLabel: {
    ...type.footnote,
    color: colors.muted,
  },
  chipLabelSelected: {
    color: colors.accent,
    fontFamily: fonts.bodySemi,
  },
  hint: {
    ...type.subhead,
    color: colors.muted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listInput: {
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  listItemText: {
    ...type.body,
    color: colors.ink,
    flex: 1,
  },
  removeText: {
    ...type.footnote,
    color: colors.error,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stageCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: spacing.sm,
  },
  previewPad: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: {
    ...type.footnote,
    color: colors.error,
    marginHorizontal: spacing.xl,
  },
  actions: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    width: "100%",
  },
  inlineBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
