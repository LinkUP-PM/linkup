import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { AnalysisSummary } from "@linkup/shared";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { StatusPill } from "../../src/components/StatusPill";
import { listAnalyses } from "../../src/lib/api";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing, type } from "../../src/theme/tokens";

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAnalyses());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!hasLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Carregando histórico…</Text>
      </View>
    );
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        brand
        title="Ainda não tem análise"
        body="O primeiro PDF já muda o jogo — envie um currículo e veja o que melhorar."
        actionLabel="Analisar um PDF"
        onAction={() => router.push("/(candidate)/analisar" as Href)}
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

      <GroupedSection header="Suas análises neste aparelho">
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.fileName}
            meta={relativeTime(item.createdAt)}
            accessory={<StatusPill status={item.status} />}
            onPress={() => router.push(`/analise/${item.id}`)}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...type.subhead,
    color: colors.muted,
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
