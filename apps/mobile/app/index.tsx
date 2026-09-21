import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { createAnalysis } from "../src/lib/api";

export default function HomeScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndSend() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const file = picked.assets[0];
    setBusy(true);
    try {
      const analysis = await createAnalysis(
        file.uri,
        file.name ?? "curriculo.pdf",
        file.mimeType ?? "application/pdf",
      );
      router.push(`/analise/${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível analisar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Analisador inteligente de currículos</Text>
      <Text style={styles.title}>Envie um PDF e receba o que melhorar agora.</Text>
      <Text style={styles.body}>
        O LinkUP mostra pontos fortes, pontos de atenção e sugestões práticas. Sem nota genérica.
      </Text>

      <Pressable style={styles.button} onPress={pickAndSend} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar currículo em PDF</Text>}
      </Pressable>

      <Pressable onPress={() => router.push("/historico")}>
        <Text style={styles.link}>Ver histórico</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <Text style={styles.hint}>Enviando e analisando…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  kicker: { color: "#8A6A3B", fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "700", color: "#1F1A16" },
  body: { fontSize: 16, color: "#4F463E", lineHeight: 22 },
  button: {
    backgroundColor: "#1F1A16",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#8A6A3B", fontWeight: "600", textAlign: "center", marginTop: 8 },
  error: { color: "#9B2C2C", lineHeight: 20 },
  hint: { color: "#4F463E" },
});
