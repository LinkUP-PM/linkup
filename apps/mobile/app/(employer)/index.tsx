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
import type { Job } from "@linkup/shared";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { listJobs } from "../../src/lib/api";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

export default function EmployerHomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listJobs());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as vagas.");
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
    return <LoadingScreen message="Carregando vagas…" />;
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        brand
        title="Nenhuma vaga ainda"
        body="Publique a primeira vaga. Os candidatos e o recrutador passam a vê-la."
        actionLabel="Abrir nova vaga"
        onAction={() => router.push("/(employer)/nova" as Href)}
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

      <GroupedSection header="Vagas deste aparelho">
        {items.map((job) => {
          const pending = job.pendingDecisionCount ?? 0;
          return (
            <ListRow
              key={job.id}
              title={job.title}
              subtitle={job.lookingFor}
              meta={`${relativeTime(job.createdAt)} · ${pending === 0 ? "Sem decisões pendentes" : `${pending} para decidir`}`}
              onPress={() => router.push(`/(employer)/indicados/${job.id}` as Href)}
            />
          );
        })}
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
