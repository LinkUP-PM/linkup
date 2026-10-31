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
import type { Interview } from "@linkup/shared";
import { INTERVIEW_STATUS_LABELS } from "@linkup/shared";
import { EmptyState } from "../../src/components/EmptyState";
import { GroupedSection } from "../../src/components/GroupedSection";
import { ListRow } from "../../src/components/ListRow";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { listInterviews } from "../../src/lib/api";
import { formatInterviewWhen } from "../../src/lib/interview-datetime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

export default function RecruiterAgendaScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Interview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listInterviews());
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
        brand
        title="Nenhuma entrevista ainda"
        body="Quando o contratante marcar uma data depois de aceitar o candidato, ela aparece aqui."
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

      <GroupedSection header="Agenda de entrevistas">
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.jobTitle}
            subtitle={item.candidateEmail ?? "Candidato"}
            meta={`${formatInterviewWhen(item.scheduledAt)} · ${INTERVIEW_STATUS_LABELS[item.status]}`}
            onPress={() => router.push(`/dossie/${item.applicationId}` as Href)}
          />
        ))}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
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
