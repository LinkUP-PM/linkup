import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { AnalysisStatus, AnalysisSummary } from "@linkup/shared";
import { listAnalyses } from "../src/lib/api";

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  PENDING: "Pendente",
  EXTRACTING: "Extraindo",
  ANALYZING: "Analisando",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
};

function statusLabel(status: AnalysisStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAnalyses());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!loading && items.length === 0 && !error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Nenhuma análise ainda</Text>
        <Text style={styles.body}>Envie o primeiro currículo em PDF para começar.</Text>
        <Pressable onPress={() => router.push("/")}>
          <Text style={styles.link}>Ir para o envio</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Histórico</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => router.push(`/analise/${item.id}`)}
        >
          <Text style={styles.cardTitle}>{item.fileName}</Text>
          <Text style={styles.meta}>
            {statusLabel(item.status)} · {new Date(item.createdAt).toLocaleString("pt-BR")}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: "#1F1A16" },
  body: { color: "#4F463E", lineHeight: 20 },
  link: { color: "#8A6A3B", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 4 },
  cardTitle: { fontWeight: "700", color: "#1F1A16" },
  meta: { color: "#6B6258" },
  errorBox: { gap: 8 },
  error: { color: "#9B2C2C" },
  retry: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#9B2C2C",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: { color: "#9B2C2C", fontWeight: "700" },
});
