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
import type { ApplicationSummary } from "@linkup/shared";
import { RECRUITER_TAG_LABELS } from "@linkup/shared";
import { ApplicationStatusPill } from "../../src/components/ApplicationStatusPill";
import { EmptyState } from "../../src/components/EmptyState";
import { listTriageInbox } from "../../src/lib/api";
import { relativeTime } from "../../src/lib/relativeTime";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

export default function RecruiterInboxScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listTriageInbox());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a inbox.");
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
      </View>
    );
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <EmptyState
        brand
        title="Nada a triar"
        body="Quando candidatos enviarem PDF às vagas do contratante, elas aparecem aqui em uma fila única — reenvios depois de ajuste ficam no topo."
      />
    );
  }

  if (error && items.length === 0) {
    return (
      <EmptyState
        title="Não foi possível abrir"
        body={error}
        actionLabel="Tentar de novo"
        onAction={load}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      <Text style={styles.subtitle}>
        Todas as candidaturas ainda na fila, de todas as vagas.
      </Text>

      {items.map((item) => {
        const isResubmit = (item.submissionCount ?? 1) > 1;
        const expanded = expandedId === item.id;
        const tags = item.recruiterTags ?? [];
        const strengths = item.previewStrengths ?? [];
        const attention = item.previewAttention ?? [];
        const skills = item.previewSkills ?? [];

        return (
          <View key={item.id} style={styles.card}>
            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => setExpandedId(expanded ? null : item.id)}
            >
              <View style={styles.cardTop}>
                <ApplicationStatusPill status={item.status} />
                {isResubmit ? (
                  <Text style={styles.resubmitBadge}>Reenvio após ajuste</Text>
                ) : null}
              </View>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.jobTitle}
              </Text>
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
              <Text style={styles.meta}>Enviada {relativeTime(item.createdAt)}</Text>
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
            <Pressable onPress={() => router.push(`/dossie/${item.id}` as Href)}>
              <Text style={styles.link}>Abrir dossiê</Text>
            </Pressable>
          </View>
        );
      })}
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.xs,
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
  jobTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  email: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
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
