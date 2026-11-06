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
import type { AgendaItem } from "@linkup/shared";
import { AgendaCalendar } from "../../src/components/AgendaCalendar";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { listAgenda } from "../../src/lib/api";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

export default function EmployerAgendaScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAgenda());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a agenda.");
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
    return <LoadingScreen message="Carregando agenda…" />;
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        title="Agenda vazia"
        body="Envios, decisões e entrevistas das suas vagas aparecem aqui depois que o processo avançar."
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

      <AgendaCalendar
        items={items}
        showCandidateEmail
        onOpenItem={(item) => router.push(`/dossie/${item.applicationId}` as Href)}
      />
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
