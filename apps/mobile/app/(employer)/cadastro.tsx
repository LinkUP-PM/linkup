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
  CompanySize,
  EmployerProfile,
  EmployerProfileInput,
  HiringArea,
  JobContractType,
  JobSeniority,
  WorkModel,
} from "@linkup/shared";
import {
  COMPANY_SIZE_LABELS,
  COMPANY_SIZES,
  HIRING_AREA_LABELS,
  HIRING_AREAS,
  JOB_BENEFIT_OPTIONS,
  JOB_CONTRACT_TYPE_LABELS,
  JOB_CONTRACT_TYPES,
  JOB_SENIORITIES,
  JOB_SENIORITY_LABELS,
  MAX_EMPLOYER_VALUES,
  WORK_MODEL_LABELS,
  WORK_MODELS,
  cnpjDigits,
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
import { getEmployerProfile, updateEmployerProfile } from "../../src/lib/api";
import { cepDigits, formatBrazilCep } from "../../src/lib/cep";
import { formatBrazilCnpj } from "../../src/lib/cnpj";
import { formatBrazilPhone, phoneDigits } from "../../src/lib/phone";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

const UF_OPTIONS = BRAZIL_UFS.map((uf) => ({
  value: uf,
  label: ufOptionLabel(uf),
}));

const STEPS = ["Empresa", "Endereço", "Responsável", "Contratação", "Cultura"] as const;

type Draft = {
  tradeName: string;
  legalName: string;
  cnpj: string;
  industry: HiringArea | null;
  companySize: CompanySize | null;
  foundedYear: string;
  website: string;
  linkedinUrl: string;
  about: string;
  livesInBrazil: boolean;
  cep: string;
  street: string;
  state: string;
  city: string;
  contactName: string;
  contactRole: string;
  phone: string;
  commercialEmail: string;
  hiringAreas: HiringArea[];
  seniorities: JobSeniority[];
  contractTypes: JobContractType[];
  workModels: WorkModel[];
  benefits: string[];
  cultureValuesText: string;
  inclusionNote: string;
};

function profileToDraft(profile: EmployerProfile): Draft {
  return {
    tradeName: profile.tradeName,
    legalName: profile.legalName,
    cnpj: profile.cnpj ? formatBrazilCnpj(profile.cnpj) : "",
    industry: profile.industry,
    companySize: profile.companySize,
    foundedYear: profile.foundedYear != null ? String(profile.foundedYear) : "",
    website: profile.website ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    about: profile.about ?? "",
    livesInBrazil: profile.livesInBrazil,
    cep: formatBrazilCep(profile.cep),
    street: profile.street,
    state: profile.state,
    city: profile.city,
    contactName: profile.contactName,
    contactRole: profile.contactRole,
    phone: formatBrazilPhone(profile.phone),
    commercialEmail: profile.commercialEmail ?? "",
    hiringAreas: [...profile.hiringAreas],
    seniorities: [...profile.seniorities],
    contractTypes: [...profile.contractTypes],
    workModels: [...profile.workModels],
    benefits: [...profile.benefits],
    cultureValuesText: profile.cultureValues.join(", "),
    inclusionNote: profile.inclusionNote ?? "",
  };
}

function draftToInput(draft: Draft): EmployerProfileInput {
  const founded = draft.foundedYear.trim();
  return {
    tradeName: draft.tradeName,
    legalName: draft.legalName,
    cnpj: cnpjDigits(draft.cnpj) || null,
    industry: draft.industry,
    companySize: draft.companySize,
    foundedYear: founded ? Number(founded) : null,
    website: draft.website || null,
    linkedinUrl: draft.linkedinUrl || null,
    about: draft.about || null,
    livesInBrazil: draft.livesInBrazil,
    cep: cepDigits(draft.cep),
    street: draft.street,
    state: draft.state,
    city: draft.city,
    contactName: draft.contactName,
    contactRole: draft.contactRole,
    phone: phoneDigits(draft.phone),
    commercialEmail: draft.commercialEmail || null,
    hiringAreas: draft.hiringAreas,
    seniorities: draft.seniorities,
    contractTypes: draft.contractTypes,
    workModels: draft.workModels,
    benefits: draft.benefits,
    cultureValues: draft.cultureValuesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_EMPLOYER_VALUES),
    inclusionNote: draft.inclusionNote || null,
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

export default function EmployerCadastroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string | string[] }>();
  const initialStep = parseCadastroStep(params.step);
  const [step, setStep] = useState(initialStep ?? 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployerProfile();
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

  async function saveCurrent(): Promise<EmployerProfile | null> {
    if (!draft) return null;
    setBusy(true);
    setError(null);
    try {
      const saved = await updateEmployerProfile(draftToInput(draft));
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
          Complete empresa, endereço e responsável para marcar como completo
        </Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 0 ? (
        <GroupedSection header="Dados da empresa">
          <View style={styles.pad}>
            <Field
              label="Nome fantasia"
              value={draft.tradeName}
              onChangeText={(tradeName) => setDraft({ ...draft, tradeName })}
              placeholder="Como a empresa é conhecida"
            />
            <Field
              label="Razão social"
              value={draft.legalName}
              onChangeText={(legalName) => setDraft({ ...draft, legalName })}
              placeholder="Nome registrado"
            />
            <Field
              label="CNPJ (opcional)"
              value={draft.cnpj}
              onChangeText={(cnpj) => setDraft({ ...draft, cnpj: formatBrazilCnpj(cnpj) })}
              placeholder="00.000.000/0000-00"
              keyboardType="number-pad"
            />
            <Text style={styles.fieldLabel}>Setor</Text>
            <View style={styles.chips}>
              {HIRING_AREAS.map((area) => (
                <Chip
                  key={area}
                  label={HIRING_AREA_LABELS[area]}
                  selected={draft.industry === area}
                  onPress={() => setDraft({ ...draft, industry: area })}
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Porte</Text>
            <View style={styles.chips}>
              {COMPANY_SIZES.map((size) => (
                <Chip
                  key={size}
                  label={COMPANY_SIZE_LABELS[size]}
                  selected={draft.companySize === size}
                  onPress={() => setDraft({ ...draft, companySize: size })}
                />
              ))}
            </View>
            <Field
              label="Ano de fundação"
              value={draft.foundedYear}
              onChangeText={(foundedYear) =>
                setDraft({ ...draft, foundedYear: foundedYear.replace(/\D/g, "").slice(0, 4) })
              }
              placeholder="2018"
              keyboardType="number-pad"
            />
            <Field
              label="Site"
              value={draft.website}
              onChangeText={(website) => setDraft({ ...draft, website })}
              placeholder="https://..."
              keyboardType="url"
            />
            <Field
              label="LinkedIn da empresa"
              value={draft.linkedinUrl}
              onChangeText={(linkedinUrl) => setDraft({ ...draft, linkedinUrl })}
              placeholder="https://linkedin.com/company/..."
              keyboardType="url"
            />
            <Field
              label="Sobre a empresa"
              value={draft.about}
              onChangeText={(about) => setDraft({ ...draft, about })}
              placeholder="O que a empresa faz e o ambiente de trabalho (mín. 40 caracteres)"
              multiline
            />
          </View>
        </GroupedSection>
      ) : null}

      {step === 1 ? (
        <GroupedSection header="Endereço">
          <View style={styles.pad}>
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Empresa no Brasil</Text>
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
        <GroupedSection header="Responsável pela conta">
          <View style={styles.pad}>
            <Field
              label="Nome"
              value={draft.contactName}
              onChangeText={(contactName) => setDraft({ ...draft, contactName })}
              placeholder="Quem publica as vagas"
            />
            <Field
              label="Cargo"
              value={draft.contactRole}
              onChangeText={(contactRole) => setDraft({ ...draft, contactRole })}
              placeholder="Ex.: Head de People, Sócio"
            />
            <Field
              label="Telefone"
              value={draft.phone}
              onChangeText={(phone) => setDraft({ ...draft, phone: formatBrazilPhone(phone) })}
              placeholder="(11) 9 9999-9999"
              keyboardType="phone-pad"
            />
            <Field
              label="E-mail comercial (opcional)"
              value={draft.commercialEmail}
              onChangeText={(commercialEmail) => setDraft({ ...draft, commercialEmail })}
              placeholder="rh@empresa.com"
              keyboardType="email-address"
            />
          </View>
        </GroupedSection>
      ) : null}

      {step === 3 ? (
        <GroupedSection header="Como a empresa contrata">
          <View style={styles.pad}>
            <Text style={styles.fieldLabel}>Áreas</Text>
            <View style={styles.chips}>
              {HIRING_AREAS.map((area) => (
                <Chip
                  key={area}
                  label={HIRING_AREA_LABELS[area]}
                  selected={draft.hiringAreas.includes(area)}
                  onPress={() =>
                    setDraft({ ...draft, hiringAreas: toggleItem(draft.hiringAreas, area) })
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
            <Text style={styles.fieldLabel}>Modelos de trabalho</Text>
            <View style={styles.chips}>
              {WORK_MODELS.map((item) => (
                <Chip
                  key={item}
                  label={WORK_MODEL_LABELS[item]}
                  selected={draft.workModels.includes(item)}
                  onPress={() =>
                    setDraft({ ...draft, workModels: toggleItem(draft.workModels, item) })
                  }
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Benefícios</Text>
            <View style={styles.chips}>
              {JOB_BENEFIT_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={draft.benefits.includes(item)}
                  onPress={() =>
                    setDraft({ ...draft, benefits: toggleItem(draft.benefits, item) })
                  }
                />
              ))}
            </View>
          </View>
        </GroupedSection>
      ) : null}

      {step === 4 ? (
        <GroupedSection header="Cultura e inclusão">
          <View style={styles.pad}>
            <Field
              label={`Valores (até ${MAX_EMPLOYER_VALUES}, separados por vírgula)`}
              value={draft.cultureValuesText}
              onChangeText={(cultureValuesText) => setDraft({ ...draft, cultureValuesText })}
              placeholder="Ex.: Transparência, Aprendizado contínuo"
              multiline
            />
            <Field
              label="Inclusão / vagas PcD"
              value={draft.inclusionNote}
              onChangeText={(inclusionNote) => setDraft({ ...draft, inclusionNote })}
              placeholder="Como a empresa acolhe diversidade e PcD"
              multiline
            />
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
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
