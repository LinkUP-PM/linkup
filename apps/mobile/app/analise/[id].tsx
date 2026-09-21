import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { AnalysisDetail } from "@linkup/shared";
import { getAnalysis } from "../../src/lib/api";

export default function AnalysisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalysis(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir esta análise.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/")}>
          <Text style={styles.link}>Voltar ao envio</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando análise…</Text>
      </View>
    );
  }

  if (data.status === "FAILED" || !data.result) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Não foi possível concluir</Text>
        <Text style={styles.error}>{data.errorMessage ?? "Tente enviar outro PDF."}</Text>
        <Pressable style={styles.retry} onPress={() => router.push("/")}>
          <Text style={styles.retryText}>Enviar outro PDF</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/historico")}>
          <Text style={styles.link}>Ver histórico</Text>
        </Pressable>
      </View>
    );
  }

  const { result } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.file}>{data.fileName}</Text>
      <Text style={styles.title}>Pontos fortes</Text>
      {result.strengths.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.detail}</Text>
        </View>
      ))}
      <Text style={styles.title}>Pontos de atenção</Text>
      {result.attentionPoints.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.detail}</Text>
        </View>
      ))}
      <Text style={styles.title}>Sugestões</Text>
      {result.suggestions.map((item) => (
        <View key={item.action} style={styles.card}>
          <Text style={styles.cardTitle}>{item.action}</Text>
          <Text style={styles.cardBody}>{item.why}</Text>
          {item.example ? <Text style={styles.example}>Ex.: {item.example}</Text> : null}
        </View>
      ))}

      <Pressable style={styles.secondary} onPress={() => router.push("/historico")}>
        <Text style={styles.secondaryText}>Ver histórico</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/")}>
        <Text style={styles.link}>Analisar outro PDF</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  file: { color: "#8A6A3B", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#1F1A16", marginTop: 8 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 6 },
  cardTitle: { fontWeight: "700", color: "#1F1A16" },
  cardBody: { color: "#4F463E", lineHeight: 20 },
  example: { color: "#6B6258", fontStyle: "italic" },
  error: { color: "#9B2C2C" },
  retry: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#9B2C2C",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  retryText: { color: "#9B2C2C", fontWeight: "700" },
  link: { color: "#8A6A3B", fontWeight: "700", marginTop: 8 },
  secondary: {
    backgroundColor: "#1F1A16",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryText: { color: "#fff", fontWeight: "700" },
});
