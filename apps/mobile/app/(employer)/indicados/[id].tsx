import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { ApplicationSummary, Job } from "@linkup/shared";
import { ApplicationStatusPill } from "../../../src/components/ApplicationStatusPill";
import { EmptyState } from "../../../src/components/EmptyState";
import { GroupedSection } from "../../../src/components/GroupedSection";
import { ListRow } from "../../../src/components/ListRow";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { getJob, listJobApplications } from "../../../src/lib/api";
import { relativeTime } from "../../../src/lib/relativeTime";
import { colors, spacing, type } from "../../../src/theme/tokens";

export default function EmployerShortlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [jobRow, apps] = await Promise.all([getJob(id), listJobApplications(id)]);
      setJob(jobRow);
      setItems(apps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os indicados.");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pending = items.filter((item) => item.status === "FORWARDED");
  const decided = items.filter((item) => item.status !== "FORWARDED");

  if (!hasLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <EmptyState title="Não foi possível abrir" body={error} actionLabel="Tentar de novo" onAction={load} />
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          brand
          title="Nenhum indicado ainda"
          body="O recrutador encaminha candidaturas da fila. Só quem foi encaminhado aparece aqui."
        />
        {id ? (
          <PrimaryButton
            label="Editar vaga"
            variant="secondary"
            onPress={() => router.push(`/(employer)/nova?id=${id}` as Href)}
            style={styles.editBtn}
          />
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.jobTitle}>{job?.title ?? "Vaga"}</Text>
        {id ? (
          <PrimaryButton
            label="Editar"
            variant="ghost"
            onPress={() => router.push(`/(employer)/nova?id=${id}` as Href)}
          />
        ) : null}
      </View>

      <GroupedSection header={`Para decidir (${pending.length})`}>
        {pending.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma decisão pendente.</Text>
        ) : (
          pending.map((item) => (
            <ListRow
              key={item.id}
              title={
                item.candidateProfile?.fullName ??
                item.candidateEmail ??
                `Encaminhada ${relativeTime(item.updatedAt)}`
              }
              subtitle={
                item.candidateProfile
                  ? `${item.candidateProfile.city}/${item.candidateProfile.state} · Encaminhada ${relativeTime(item.updatedAt)}`
                  : `Encaminhada ${relativeTime(item.updatedAt)}`
              }
              accessory={<ApplicationStatusPill status={item.status} />}
              onPress={() => router.push(`/dossie/${item.id}` as Href)}
            />
          ))
        )}
      </GroupedSection>

      <GroupedSection header={`Já decididos (${decided.length})`}>
        {decided.length === 0 ? (
          <Text style={styles.emptyHint}>Ainda não há aceites, recusas ou pedidos de ajuste.</Text>
        ) : (
          decided.map((item) => (
            <ListRow
              key={item.id}
              title={
                item.candidateProfile?.fullName ??
                item.candidateEmail ??
                `Atualizada ${relativeTime(item.updatedAt)}`
              }
              subtitle={
                item.decisionMessage ??
                (item.candidateProfile
                  ? `${item.candidateProfile.city}/${item.candidateProfile.state}`
                  : undefined)
              }
              accessory={<ApplicationStatusPill status={item.status} />}
              onPress={() => router.push(`/dossie/${item.id}` as Href)}
            />
          ))
        )}
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
    backgroundColor: colors.background,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.tabBarClearance,
  },
  editBtn: {
    marginHorizontal: spacing.lg,
  },
  titleRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  jobTitle: {
    ...type.title1,
    color: colors.ink,
  },
  emptyHint: {
    ...type.footnote,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
