import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { Me, RecruiterProfile } from "@linkup/shared";
import {
  HIRING_AREA_LABELS,
  JOB_CONTRACT_TYPE_LABELS,
  JOB_SENIORITY_LABELS,
  LANGUAGE_LEVEL_LABELS,
  RECRUITER_WORK_MODE_LABELS,
  recruiterProfileStrength,
  type RecruiterProfileStrengthDestination,
} from "@linkup/shared";
import { BrandLogo, brandLogoSizes } from "../../src/components/BrandLogo";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { getMe, getRecruiterProfile, logout } from "../../src/lib/api";
import { formatBrazilPhone } from "../../src/lib/phone";
import { colors, fonts, spacing, type } from "../../src/theme/tokens";

function cadastroHref(step?: number): Href {
  if (step == null) return "/(recruiter)/cadastro" as Href;
  return `/(recruiter)/cadastro?step=${step}` as Href;
}

export default function RecruiterPerfilScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [user, recruiterProfile] = await Promise.all([getMe(), getRecruiterProfile()]);
      setMe(user);
      setProfile(recruiterProfile);
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

  const strength = useMemo(() => recruiterProfileStrength(profile), [profile]);
  const strengthPercent =
    strength.total > 0 ? Math.round((strength.done / strength.total) * 100) : 0;
  const incompleteItems = strength.items.filter((item) => !item.done);

  const location =
    profile?.city && profile?.state
      ? `${profile.city}/${profile.state}`
      : profile?.city || profile?.state || null;

  function openCadastro(step?: RecruiterProfileStrengthDestination) {
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
    profile && profile.focusAreas.length > 0
      ? profile.focusAreas.map((area) => HIRING_AREA_LABELS[area]).join(" · ")
      : null;
  const senioritiesLabel =
    profile && profile.seniorities.length > 0
      ? profile.seniorities.map((item) => JOB_SENIORITY_LABELS[item]).join(" · ")
      : null;
  const contractsLabel =
    profile && profile.contractTypes.length > 0
      ? profile.contractTypes.map((item) => JOB_CONTRACT_TYPE_LABELS[item]).join(" · ")
      : null;
  const languagesLabel =
    profile && profile.languages.length > 0
      ? profile.languages
          .map((lang) => `${lang.language} (${LANGUAGE_LEVEL_LABELS[lang.level]})`)
          .join(" · ")
      : null;
  const certificatesLabel =
    profile && profile.certificates.length > 0
      ? profile.certificates.map((item) => item.title).join(" · ")
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <GroupedSection header="Identidade">
        <ListRow
          title={profile?.fullName?.trim() || "Completar perfil profissional"}
          subtitle={
            [profile?.headline?.trim(), location].filter(Boolean).join(" · ") ||
            "Nome, headline e cidade"
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
              ? "Perfil completo. LinkedIn, anos e idiomas são opcionais."
              : "Perfil pronto para triagem."
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

      <GroupedSection header="Pessoal">
        <ListRow
          title="Headline"
          subtitle={profile?.headline?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Telefone"
          subtitle={profile?.phone ? formatBrazilPhone(profile.phone) : "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="LinkedIn"
          subtitle={profile?.linkedinUrl?.trim() || "Não informado"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Localização"
          subtitle={location || "Não informada"}
          onPress={() => openCadastro(0)}
        />
        <ListRow
          title="Bio"
          subtitle={profile?.bio?.trim() || "Não informada"}
          onPress={() => openCadastro(0)}
        />
      </GroupedSection>

      <GroupedSection header="Atuação">
        <ListRow
          title="Como trabalha"
          subtitle={
            profile?.workMode ? RECRUITER_WORK_MODE_LABELS[profile.workMode] : "Não informado"
          }
          onPress={() => openCadastro(1)}
        />
        <ListRow
          title="Consultoria"
          subtitle={profile?.consultancyName?.trim() || "Não informada"}
          onPress={() => openCadastro(1)}
        />
        <ListRow
          title="Site da consultoria"
          subtitle={profile?.consultancyWebsite?.trim() || "Não informado"}
          onPress={() => openCadastro(1)}
        />
        <ListRow
          title="Anos de experiência"
          subtitle={
            profile?.yearsExperience != null ? String(profile.yearsExperience) : "Não informado"
          }
          onPress={() => openCadastro(1)}
        />
        <ListRow
          title="Disponibilidade"
          subtitle={profile?.availability?.trim() || "Não informada"}
          onPress={() => openCadastro(1)}
        />
      </GroupedSection>

      <GroupedSection header="Especialidade">
        <ListRow
          title="Áreas de foco"
          subtitle={areasLabel ?? "Nenhuma área informada"}
          onPress={() => openCadastro(2)}
        />
        <ListRow
          title="Senioridades"
          subtitle={senioritiesLabel ?? "Não informadas"}
          onPress={() => openCadastro(2)}
        />
        <ListRow
          title="Tipos de contrato"
          subtitle={contractsLabel ?? "Não informados"}
          onPress={() => openCadastro(2)}
        />
        <ListRow
          title="Idiomas"
          subtitle={languagesLabel ?? "Nenhum idioma informado"}
          onPress={() => openCadastro(2)}
        />
        <ListRow
          title="Certificações"
          subtitle={certificatesLabel ?? "Nenhuma certificação"}
          onPress={() => openCadastro(2)}
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
