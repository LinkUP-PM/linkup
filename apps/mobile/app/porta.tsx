import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Role } from "@linkup/shared";
import { ROLE_LABELS } from "@linkup/shared";
import { Enter } from "../src/components/Enter";
import { GroupedSection } from "../src/components/GroupedSection";
import { loginHrefForRole } from "../src/lib/role";
import { enter } from "../src/theme/motion";
import { colors, fonts, spacing, type } from "../src/theme/tokens";

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
      <Pressable
        onPress={() => router.replace("/home" as Href)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={({ pressed }) => [styles.back, pressed && styles.rowPressed]}
      >
        <Ionicons name="chevron-back" size={28} color={colors.accent} />
      </Pressable>

      <Enter variant="fadeUp" delay={enter.delays.header}>
        <Text style={styles.brand}>LinkUP</Text>
        <Text style={styles.title}>Como você entra?</Text>
        <Text style={styles.body}>
          Escolha a porta do seu papel. Em seguida entre ou crie a conta.
        </Text>
      </Enter>

      <Enter variant="fadeUp" delay={enter.delays.list}>
        <GroupedSection header="Papéis">
          {OPTIONS.map((option) => (
            <Pressable
              key={option.role}
              onPress={() => router.push(loginHrefForRole(option.role) as Href)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.cardTitle}>{ROLE_LABELS[option.role]}</Text>
                <Text style={styles.cardBody}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.tertiary} />
            </Pressable>
          ))}
        </GroupedSection>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  brand: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  title: {
    ...type.largeTitle,
    color: colors.ink,
    marginHorizontal: spacing.lg,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...type.headline,
    color: colors.ink,
  },
  cardBody: {
    ...type.footnote,
    color: colors.muted,
  },
});
