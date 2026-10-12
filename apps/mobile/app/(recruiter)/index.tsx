import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../src/theme/tokens";

export default function RecruiterHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>LinkUP</Text>
      <Text style={styles.title}>Área do recrutador</Text>
      <Text style={styles.body}>
        Você entrou pela porta certa. A fila de triagem — encaminhar ou descartar —
        chega no próximo corte, em cima das candidaturas que o candidato já envia.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    justifyContent: "center",
  },
  brand: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
});
