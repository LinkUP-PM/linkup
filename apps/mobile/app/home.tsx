import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { BrandLogo } from "../src/components/BrandLogo";
import { Enter } from "../src/components/Enter";
import { GroupedSection, GroupedRow } from "../src/components/GroupedSection";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { enter } from "../src/theme/motion";
import { colors, fonts, radius, spacing, type } from "../src/theme/tokens";

const STEPS = [
  "O contratante abre a vaga",
  "O candidato envia o PDF",
  "O recrutador tria e o contratante decide",
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.88, 420);

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
      <Enter variant="fade" delay={enter.delays.logo}>
        <BrandLogo variant="wordmark" width={logoWidth} style={styles.brand} />
      </Enter>

      <Enter variant="fadeUp" delay={enter.delays.body} style={styles.content}>
        <Text style={styles.title}>Seu currículo vira um plano.</Text>
        <Text style={styles.body}>
          O PDF vira pontos fortes, atenção e o que fazer em seguida. A candidatura
          segue até o recrutador e o contratante.
        </Text>

        <GroupedSection header="Como funciona" style={styles.steps}>
          {STEPS.map((step, index) => (
            <GroupedRow key={step} style={styles.stepRow}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </GroupedRow>
          ))}
        </GroupedSection>
      </Enter>

      <Enter variant="fadeUp" delay={enter.delays.cta}>
        <PrimaryButton
          label="Entrar"
          onPress={() => router.push("/porta" as Href)}
          style={styles.cta}
        />
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  brand: {
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
  steps: {
    marginTop: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndexText: {
    ...type.footnote,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  stepText: {
    flex: 1,
    ...type.subhead,
    color: colors.ink,
  },
  cta: {
    marginHorizontal: spacing.lg,
  },
});
