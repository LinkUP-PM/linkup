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
import type { ApplicationSummary } from "@linkup/shared";
import { INTERVIEW_STATUS_LABELS } from "@linkup/shared";
import { ApplicationStatusPill } from "../../src/components/ApplicationStatusPill";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { listApplications } from "../../src/lib/api";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listApplications());
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

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        brand
        title="Nenhuma candidatura ainda"
        body="Veja as vagas abertas, envie o PDF e acompanhe o status por aqui."
        actionLabel="Ver vagas"
        onAction={() => router.push("/(candidate)/vagas" as Href)}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
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
