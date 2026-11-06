import { useCallback, useEffect, useMemo, useState } from "react";
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
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

export default function RecruiterHomeScreen() {
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

  const triageTotal = useMemo(
    () => items.reduce((sum, job) => sum + (job.queueCount ?? 0), 0),
    [items],
  );

  if (!hasLoaded) {
    return <LoadingScreen message="Carregando filas…" />;
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        brand
        title="Nenhuma vaga ainda"
        body="O recrutador não cria vagas. Peça ao contratante para publicar uma vaga neste aparelho; quando candidatos enviarem PDF, a triagem aparece aqui."
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      <Text style={styles.largeTitle}>Triagem</Text>

      <Pressable
        style={({ pressed }) => [styles.inboxCard, pressed && styles.pressed]}
        onPress={() => router.push("/(recruiter)/inbox" as Href)}
      >
        <Text style={styles.inboxLabel}>A triar</Text>
        <Text style={styles.inboxCount}>
          {triageTotal === 0
            ? "Ninguém na fila agora"
            : triageTotal === 1
              ? "1 candidatura aguardando"
              : `${triageTotal} candidaturas aguardando`}
        </Text>
        <Text style={styles.inboxLink}>Abrir inbox global</Text>
      </Pressable>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retry}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      <GroupedSection header="Vagas com fila de triagem">
        {items.map((job) => {
          const queue = job.queueCount ?? 0;
          const forwarded = job.forwardedCount ?? 0;
          const adjustment = job.adjustmentCount ?? 0;
          const closed = job.closedCount ?? 0;
          return (
            <ListRow
              key={job.id}
              title={job.title}
              subtitle={job.lookingFor}
              meta={`${relativeTime(job.createdAt)} · ${queue === 0 ? "Fila vazia" : `${queue} na fila`} · Enc. ${forwarded} · Aj. ${adjustment} · Encerr. ${closed}`}
              onPress={() => router.push(`/(recruiter)/fila/${job.id}` as Href)}
            />
          );
        })}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.tabBarClearance,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  largeTitle: {
    ...type.largeTitle,
    color: colors.ink,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inboxCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.group,
    padding: spacing.lg,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  inboxLabel: {
    ...type.caption1,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inboxCount: {
    ...type.title3,
    color: colors.ink,
  },
  inboxLink: {
    ...type.subhead,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    marginTop: spacing.xs,
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
