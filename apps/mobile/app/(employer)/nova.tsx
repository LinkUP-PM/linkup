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
import { GroupedSection } from "../../src/components/GroupedSection";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { createJob } from "../../src/lib/api";
import { colors, fonts, spacing, type } from "../../src/theme/tokens";

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
          Título, descrição e o que você procura. A vaga já nasce ligada à sua conta.
        </Text>

        <GroupedSection header="Detalhes">
          <View style={styles.field}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Desenvolvedor mobile"
              placeholderTextColor={colors.tertiary}
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
              placeholderTextColor={colors.tertiary}
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
              placeholderTextColor={colors.tertiary}
              style={[styles.input, styles.multiline]}
              multiline
              textAlignVertical="top"
              editable={!busy}
            />
          </View>
        </GroupedSection>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Publicar vaga"
          onPress={() => void submit()}
          disabled={busy || title.trim().length < 3 || description.trim().length < 3 || lookingFor.trim().length < 3}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.tabBarClearance,
    gap: spacing.md,
  },
  intro: {
    ...type.subhead,
    color: colors.muted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  field: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    ...type.body,
    color: colors.ink,
    paddingVertical: spacing.xs,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.xs,
  },
  error: {
    ...type.footnote,
    color: colors.error,
    marginHorizontal: spacing.xl,
  },
  submit: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});
