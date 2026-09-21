import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { AnalysisDetail } from "@linkup/shared";
import { Card } from "../../src/components/Card";
import { DimensionCard } from "../../src/components/DimensionCard";
import { EmptyState } from "../../src/components/EmptyState";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SectionHeader } from "../../src/components/SectionHeader";
import { getAnalysis } from "../../src/lib/api";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

const IN_PROGRESS = new Set(["PENDING", "EXTRACTING", "ANALYZING"]);
const POLL_MS = 2500;

export default function AnalysisScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    if (!hasLoadedOnce.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      setData(await getAnalysis(id));
      hasLoadedOnce.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir esta análise.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || !IN_PROGRESS.has(data.status) || data.result) return;
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [data, load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data?.fileName ?? "Análise",
    });
  }, [navigation, data?.fileName]);

  if (error && !data) {
    return (
      <EmptyState
        title="Não foi possível abrir"
        body={error}
        actionLabel="Tentar de novo"
        onAction={load}
        secondaryLabel="Voltar ao envio"
        onSecondary={() => router.push("/(tabs)/index")}
      />
    );
  }

  if (!data || (loading && !hasLoadedOnce.current)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Abrindo análise…</Text>
      </View>
    );
  }

  if (IN_PROGRESS.has(data.status) && !data.result) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.inProgressTitle}>Ainda analisando</Text>
        <Text style={styles.loadingText}>
          Extração e IA ainda estão rodando. Atualizamos automaticamente.
        </Text>
        <PrimaryButton
          label={refreshing ? "Atualizando…" : "Atualizar agora"}
          onPress={load}
          disabled={refreshing}
          style={styles.action}
        />
        <PrimaryButton label="Ver histórico" onPress={() => router.push("/historico")} variant="ghost" />
      </View>
    );
  }

  if (data.status === "FAILED" || !data.result) {
    return (
      <EmptyState
        title="Não foi possível concluir"
        body={data.errorMessage ?? "Tente enviar outro PDF."}
        actionLabel="Enviar outro PDF"
        onAction={() => router.push("/(tabs)/index")}
        secondaryLabel="Ver histórico"
        onSecondary={() => router.push("/historico")}
      />
    );
  }

  const { result } = data;
  const summary = `${result.strengths.length} fortes · ${result.attentionPoints.length} atenções · ${result.suggestions.length} sugestões`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.summary}>{summary}</Text>

      <SectionHeader title="Pontos fortes" tone="strengths" count={result.strengths.length} />
      {result.strengths.map((item) => (
        <Card key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.detail}</Text>
        </Card>
      ))}

      <SectionHeader title="Pontos de atenção" tone="attention" count={result.attentionPoints.length} />
      {result.attentionPoints.map((item) => (
        <Card key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.detail}</Text>
        </Card>
      ))}

      <SectionHeader title="Sugestões" tone="suggestions" count={result.suggestions.length} />
      {result.suggestions.map((item, index) => (
        <Card key={item.action} style={styles.card}>
          <View style={styles.suggestionRow}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.cardTitle}>{item.action}</Text>
              <Text style={styles.cardBody}>{item.why}</Text>
              {item.example ? <Text style={styles.example}>Ex.: {item.example}</Text> : null}
            </View>
          </View>
        </Card>
      ))}

      <SectionHeader title="Leitura por dimensão" tone="neutral" />
      <DimensionCard title="Estrutura" summary={result.dimensions.structure.summary} />
      <DimensionCard title="Clareza" summary={result.dimensions.clarity.summary} />
      <DimensionCard
        title="Competências"
        summary={result.dimensions.skills.summary}
        present={result.dimensions.skills.identified}
        missing={result.dimensions.skills.missing}
        presentLabel="Identificadas"
        missingLabel="Em falta"
      />
      <DimensionCard
        title="Palavras-chave"
        summary={result.dimensions.keywords.summary}
        present={result.dimensions.keywords.present}
        missing={result.dimensions.keywords.missing}
        presentLabel="Presentes"
        missingLabel="Pouco visíveis"
      />

      <PrimaryButton
        label="Analisar outro PDF"
        onPress={() => router.push("/(tabs)/index")}
        variant="secondary"
        style={styles.footerAction}
      />
      <Pressable onPress={() => router.push("/historico")} style={styles.footerLink}>
        <Text style={styles.link}>Ver no histórico</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  summary: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  example: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.suggestionsSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  numberText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.suggestions,
  },
  suggestionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  inProgressTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  action: {
    marginTop: spacing.sm,
  },
  footerAction: {
    marginTop: spacing.xl,
  },
  footerLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  link: {
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    fontSize: 15,
  },
});
