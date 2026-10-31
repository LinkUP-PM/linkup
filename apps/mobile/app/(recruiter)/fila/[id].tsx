import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { ApplicationStatus, ApplicationSummary, Job } from "@linkup/shared";
import { RECRUITER_TAG_LABELS } from "@linkup/shared";
import { ApplicationStatusPill } from "../../../src/components/ApplicationStatusPill";
import { EmptyState } from "../../../src/components/EmptyState";
import { getJob, listJobApplications } from "../../../src/lib/api";
import { relativeTime } from "../../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../../src/theme/tokens";

type QueueFilter =
  | "all"
  | "queue"
  | "resubmits"
  | "forwarded"
  | "adjustment"
  | "closed";

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "queue", label: "Só fila" },
  { id: "resubmits", label: "Só reenvios" },
  { id: "forwarded", label: "Encaminhadas" },
  { id: "adjustment", label: "Em ajuste" },
  { id: "closed", label: "Encerradas" },
];

const CLOSED: ApplicationStatus[] = ["DISCARDED", "ACCEPTED", "REJECTED"];

function sortQueue(items: ApplicationSummary[]): ApplicationSummary[] {
  return [...items].sort((a, b) => {
    const aResubmit = (a.submissionCount ?? 1) > 1 ? 1 : 0;
    const bResubmit = (b.submissionCount ?? 1) > 1 ? 1 : 0;
    if (aResubmit !== bResubmit) return bResubmit - aResubmit;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function matchesFilter(item: ApplicationSummary, filter: QueueFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "queue":
      return item.status === "SUBMITTED";
    case "resubmits":
      return item.status === "SUBMITTED" && (item.submissionCount ?? 1) > 1;
    case "forwarded":
      return item.status === "FORWARDED";
    case "adjustment":
      return item.status === "ADJUSTMENT_REQUESTED";
    case "closed":
      return CLOSED.includes(item.status);
    default:
      return true;
  }
}

function QueueCard({
  item,
  expanded,
  onToggle,
  onOpen,
}: {
  item: ApplicationSummary;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const isResubmit = (item.submissionCount ?? 1) > 1;
  const skills = item.previewSkills ?? [];
  const tags = item.recruiterTags ?? [];
  const strengths = item.previewStrengths ?? [];
  const attention = item.previewAttention ?? [];

  return (
    <View style={styles.card}>
      <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={onToggle}>
        <View style={styles.cardTop}>
          <ApplicationStatusPill status={item.status} />
          {isResubmit ? (
            <Text style={styles.resubmitBadge}>Reenvio após ajuste</Text>
          ) : null}
        </View>
        {item.candidateEmail ? (
          <Text style={styles.email} numberOfLines={1}>
            {item.candidateEmail}
          </Text>
        ) : null}
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text key={tag} style={styles.tagChip}>
                {RECRUITER_TAG_LABELS[tag]}
              </Text>
            ))}
          </View>
        ) : null}
        {skills.length > 0 ? (
          <View style={styles.skills}>
            {skills.map((skill) => (
              <Text key={skill} style={styles.skillChip}>
                {skill}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.meta}>
          {item.status === "SUBMITTED"
            ? `Enviada ${relativeTime(item.createdAt)}`
            : `Atualizada ${relativeTime(item.updatedAt)}`}
        </Text>
        {item.decisionMessage ? (
          <Text style={styles.message} numberOfLines={2}>
            {item.decisionMessage}
          </Text>
        ) : null}
        {expanded ? (
          <View style={styles.preview}>
            {strengths.length > 0 ? (
              <>
                <Text style={styles.previewLabel}>Fortes</Text>
                {strengths.map((title) => (
                  <Text key={title} style={styles.previewLine}>
                    · {title}
                  </Text>
                ))}
              </>
            ) : null}
            {attention.length > 0 ? (
              <>
                <Text style={styles.previewLabel}>Atenção</Text>
                {attention.map((title) => (
                  <Text key={title} style={styles.previewLine}>
                    · {title}
                  </Text>
                ))}
              </>
            ) : null}
            {strengths.length === 0 && attention.length === 0 ? (
              <Text style={styles.previewLine}>Prévia da análise ainda indisponível.</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.hint}>Toque para prévia rápida</Text>
        )}
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text style={styles.link}>Abrir dossiê</Text>
      </Pressable>
    </View>
  );
}

export default function RecruiterQueueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [jobRow, apps] = await Promise.all([getJob(id), listJobApplications(id)]);
      setJob(jobRow);
      setItems(apps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a fila.");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!q) return true;
      return (item.candidateEmail ?? "").toLowerCase().includes(q);
    });
    return sortQueue(list);
  }, [items, filter, query]);

  const queueCount = items.filter((item) => item.status === "SUBMITTED").length;
  const hasApplications = items.length > 0;

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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.jobTitle}>{job?.title ?? "Vaga"}</Text>
        {job?.lookingFor ? (
          <Text style={styles.lookingFor} numberOfLines={2}>
            {job.lookingFor}
          </Text>
        ) : null}
      </View>

      {!hasApplications ? (
        <EmptyState
          brand
          title="Ninguém na fila"
          body="Quando um candidato enviar o PDF para esta vaga, a candidatura entra aqui para triagem."
        />
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por e-mail"
            placeholderTextColor={colors.muted}
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((chip) => {
              const active = filter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setFilter(chip.id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.filterText, active && styles.filterTextActive]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>
            {filter === "all"
              ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} · ${queueCount} na fila`
              : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`}
          </Text>

          {filtered.length === 0 ? (
            <Text style={styles.emptyHint}>
              Nenhuma candidatura com este filtro ou busca.
            </Text>
          ) : (
            <View style={styles.list}>
              {filtered.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onOpen={() => router.push(`/dossie/${item.id}` as Href)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  jobTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  lookingFor: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    flexShrink: 0,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accentSoft,
  },
  filterText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.accent,
  },
  section: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  list: {
    gap: spacing.md,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  cardTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  resubmitBadge: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.attention,
    backgroundColor: colors.attentionSoft,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  email: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagChip: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  skillChip: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  preview: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  previewLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  previewLine: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  link: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.accent,
  },
});
