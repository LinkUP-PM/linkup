import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { AnalysisDetail } from "@linkup/shared";
import { getAnalysis } from "../../src/lib/api";

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAnalysis(id).then(setData).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Não foi possível abrir esta análise.");
    });
  }, [id]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!data) {
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
});
