import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { ApplicationSummary, CandidateProfile } from "@linkup/shared";
import { INTERVIEW_STATUS_LABELS } from "@linkup/shared";
import { ApplicationStatusPill } from "../../src/components/ApplicationStatusPill";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { getCandidateProfile, listApplications } from "../../src/lib/api";
import { formatInterviewWhen } from "../../src/lib/interview-datetime";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

function applicationMeta(item: ApplicationSummary): string {
  const base = relativeTime(item.createdAt);
  if (item.interviewStatus && item.interviewScheduledAt) {
    return `${base} · ${INTERVIEW_STATUS_LABELS[item.interviewStatus]} · ${formatInterviewWhen(item.interviewScheduledAt)}`;
  }
  return base;
}

export default function CandidateHomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, candidateProfile] = await Promise.all([
        listApplications(),
        getCandidateProfile(),
      ]);
      setItems(apps);
      setProfile(candidateProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as candidaturas.");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!hasLoaded) {
    return <LoadingScreen message="Carregando candidaturas…" />;
  }

  const incompleteBanner =
    profile && !profile.isComplete ? (
      <Pressable
        style={styles.banner}
        onPress={() => router.push("/(candidate)/cadastro" as Href)}
      >
        <Text style={styles.bannerTitle}>Complete seu cadastro</Text>
        <Text style={styles.bannerBody}>
          Dados pessoais e endereço ajudam recrutador e contratante a te identificar além do e-mail.
        </Text>
      </Pressable>
    ) : null;

  if (!loading && items.length === 0 && !error) {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      >
        {incompleteBanner}
        <EmptyState
          brand
          title="Nenhuma candidatura ainda"
          body="Veja as vagas abertas, envie o PDF e acompanhe o status por aqui."
          actionLabel="Ver vagas"
          onAction={() => router.push("/(candidate)/vagas" as Href)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      {incompleteBanner}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retry}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      <GroupedSection header="Em andamento neste aparelho">
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.jobTitle}
            meta={applicationMeta(item)}
            accessory={<ApplicationStatusPill status={item.status} />}
            onPress={() => router.push(`/candidatura/${item.id}` as Href)}
          />
        ))}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.tabBarClearance,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.group,
    backgroundColor: colors.accentSoft,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    fontSize: 15,
  },
  bannerBody: {
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  errorBox: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.group,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.error,
    lineHeight: 20,
  },
  retry: {
    fontFamily: fonts.bodyBold,
    color: colors.error,
  },
});
