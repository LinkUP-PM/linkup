import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import type { Role } from "@linkup/shared";
import { ROLE_LABELS } from "@linkup/shared";
import { setRole } from "../src/lib/api";
import { homeHrefForRole, setStoredRole } from "../src/lib/role";
import { colors, fonts, radius, spacing } from "../src/theme/tokens";

const OPTIONS: { role: Role; description: string }[] = [
  {
    role: "CANDIDATE",
    description: "Ver vagas, enviar o PDF e acompanhar a candidatura.",
  },
  {
    role: "RECRUITER",
    description: "Triar candidaturas. A fila chega no próximo passo.",
  },
  {
    role: "EMPLOYER",
    description: "Abrir vagas e decidir sobre quem for encaminhado.",
  },
];

export default function PortaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(role: Role) {
    setError(null);
    setBusy(role);
    try {
      await setRole(role);
      await setStoredRole(role);
      router.replace(homeHrefForRole(role) as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o papel.");
      setBusy(null);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, spacing.xl),
          paddingBottom: Math.max(insets.bottom, spacing.xl),
        },
      ]}
    >
      <Text style={styles.brand}>LinkUP</Text>
      <Text style={styles.title}>Como você entra?</Text>
      <Text style={styles.body}>
        Escolha uma porta. Este aparelho fica com esse papel — sem login.
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = busy === option.role;
          return (
            <Pressable
              key={option.role}
              disabled={busy !== null}
              onPress={() => void choose(option.role)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
                selected && styles.cardSelected,
              ]}
            >
              <Text style={styles.cardTitle}>{ROLE_LABELS[option.role]}</Text>
              <Text style={styles.cardBody}>{option.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  brand: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  options: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  cardSelected: {
    borderColor: colors.accent,
    opacity: 0.7,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  error: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
});
