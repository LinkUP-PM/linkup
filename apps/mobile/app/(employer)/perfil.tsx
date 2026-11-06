import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { EmployerProfile, Me } from "@linkup/shared";
import {
  COMPANY_SIZE_LABELS,
  HIRING_AREA_LABELS,
  JOB_CONTRACT_TYPE_LABELS,
  JOB_SENIORITY_LABELS,
  WORK_MODEL_LABELS,
  employerProfileStrength,
  type EmployerProfileStrengthDestination,
} from "@linkup/shared";
import { BrandLogo, brandLogoSizes } from "../../src/components/BrandLogo";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { formatBrazilCnpj } from "../../src/lib/cnpj";
import { getEmployerProfile, getMe, logout } from "../../src/lib/api";
import { formatBrazilPhone } from "../../src/lib/phone";
import { colors, fonts, spacing, type } from "../../src/theme/tokens";

function cadastroHref(step?: number): Href {
  if (step == null) return "/(employer)/cadastro" as Href;
  return `/(employer)/cadastro?step=${step}` as Href;
}

export default function EmployerPerfilScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [user, employerProfile] = await Promise.all([getMe(), getEmployerProfile()]);
      setMe(user);
      setProfile(employerProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil.");
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

  const strength = useMemo(() => employerProfileStrength(profile), [profile]);
  const strengthPercent =
    strength.total > 0 ? Math.round((strength.done / strength.total) * 100) : 0;
  const incompleteItems = strength.items.filter((item) => !item.done);

  const location =
    profile?.city && profile?.state
      ? `${profile.city}/${profile.state}`
      : profile?.city || profile?.state || null;

  function openCadastro(step?: EmployerProfileStrengthDestination) {
    router.push(cadastroHref(step));
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

  const areasLabel =
    profile && profile.hiringAreas.length > 0
      ? profile.hiringAreas.map((area) => HIRING_AREA_LABELS[area]).join(" · ")
      : null;
  const senioritiesLabel =
    profile && profile.seniorities.length > 0
      ? profile.seniorities.map((item) => JOB_SENIORITY_LABELS[item]).join(" · ")
      : null;
  const contractsLabel =
    profile && profile.contractTypes.length > 0
      ? profile.contractTypes.map((item) => JOB_CONTRACT_TYPE_LABELS[item]).join(" · ")
      : null;
  const workModelsLabel =
    profile && profile.workModels.length > 0
      ? profile.workModels.map((item) => WORK_MODEL_LABELS[item]).join(" · ")
      : null;
  const benefitsLabel =
    profile && profile.benefits.length > 0 ? profile.benefits.join(" · ") : null;
  const valuesLabel =
    profile && profile.cultureValues.length > 0 ? profile.cultureValues.join(" · ") : null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <GroupedSection header="Empresa">
        <ListRow
          title={profile?.tradeName?.trim() || "Completar perfil da empresa"}
          subtitle={
            [
              location,
              profile?.industry ? HIRING_AREA_LABELS[profile.industry] : null,
              profile?.companySize ? COMPANY_SIZE_LABELS[profile.companySize] : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Nome, setor, porte e localização"
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
              ? "Perfil completo. CNPJ, site, áreas e benefícios são opcionais."
              : "Perfil pronto para publicar vagas."
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
            onPress={() => openCadastro(item.destination)}
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

      <GroupedSection header="Identidade">
        <ListRow
          title="Nome fantasia"
          subtitle={profile?.tradeName?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Razão social"
          subtitle={profile?.legalName?.trim() || "Não informada"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="CNPJ"
          subtitle={profile?.cnpj ? formatBrazilCnpj(profile.cnpj) : "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Sobre a empresa"
          subtitle={profile?.about?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Site"
          subtitle={profile?.website?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="LinkedIn"
          subtitle={profile?.linkedinUrl?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
      </GroupedSection>

      <GroupedSection header="Endereço">
        <ListRow
          title="Localização"
          subtitle={location || "Não informada"}
          onPress={() => openCadastro(1)}
        />
        <ListRow
          title="Logradouro"
          subtitle={profile?.street?.trim() || "Não informado"}
          onPress={() => openCadastro(1)}
        />
      </GroupedSection>

      <GroupedSection header="Responsável">
        <ListRow
          title={profile?.contactName?.trim() || "Nome do responsável"}
          subtitle={
            [profile?.contactRole?.trim(), profile?.phone ? formatBrazilPhone(profile.phone) : null]
              .filter(Boolean)
              .join(" · ") || "Cargo e telefone"
          }
          onPress={() => openCadastro(2)}
        />
        <ListRow
          title="E-mail comercial"
          subtitle={profile?.commercialEmail?.trim() || "Não informado"}
          onPress={() => openCadastro(2)}
        />
      </GroupedSection>

      <GroupedSection header="Contratação">
        <ListRow
          title="Áreas"
          subtitle={areasLabel ?? "Nenhuma área informada"}
          onPress={() => openCadastro(3)}
        />
        <ListRow
          title="Senioridades"
          subtitle={senioritiesLabel ?? "Não informadas"}
          onPress={() => openCadastro(3)}
        />
        <ListRow
          title="Tipos de contrato"
          subtitle={contractsLabel ?? "Não informados"}
          onPress={() => openCadastro(3)}
        />
        <ListRow
          title="Modelos de trabalho"
          subtitle={workModelsLabel ?? "Não informados"}
          onPress={() => openCadastro(3)}
        />
        <ListRow
          title="Benefícios"
          subtitle={benefitsLabel ?? "Nenhum benefício informado"}
          onPress={() => openCadastro(3)}
        />
      </GroupedSection>

      <GroupedSection header="Cultura">
        <ListRow
          title="Valores"
          subtitle={valuesLabel ?? "Nenhum valor informado"}
          onPress={() => openCadastro(4)}
        />
        <ListRow
          title="Inclusão / PcD"
          subtitle={profile?.inclusionNote?.trim() || "Não informado"}
          onPress={() => openCadastro(4)}
        />
      </GroupedSection>

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
  pad: {
    padding: spacing.lg,
    gap: spacing.md,
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
