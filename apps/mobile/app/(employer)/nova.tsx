import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { createJob } from "../../src/lib/api";
import { colors, fonts, radius, spacing } from "../../src/theme/tokens";

export default function NewJobScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await createJob({
        title: title.trim(),
        description: description.trim(),
        lookingFor: lookingFor.trim(),
      });
      setTitle("");
      setDescription("");
      setLookingFor("");
      router.push("/(employer)" as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a vaga.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Título, descrição e o que você procura. A vaga já nasce ligada a este aparelho.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Desenvolvedor mobile"
            placeholderTextColor={colors.muted}
            style={styles.input}
            editable={!busy}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Contexto da vaga, time, stack…"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
            editable={!busy}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>O que procura</Text>
          <TextInput
            value={lookingFor}
            onChangeText={setLookingFor}
            placeholder="Experiências, competências, perfil…"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
            editable={!busy}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Publicar vaga"
          onPress={() => void submit()}
          disabled={busy || title.trim().length < 3 || description.trim().length < 3 || lookingFor.trim().length < 3}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: {
    minHeight: 110,
    paddingTop: spacing.md,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
});
