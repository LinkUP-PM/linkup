import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { getMe } from "../src/lib/api";
import { homeHrefForRole, isRole } from "../src/lib/role";
import { clearSessionToken, getSessionToken } from "../src/lib/session";
import { colors, fonts, spacing } from "../src/theme/tokens";

export default function BootstrapScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const token = await getSessionToken();
        if (!token) {
          if (!cancelled) router.replace("/home" as Href);
          return;
        }

        const me = await getMe();
        if (cancelled) return;

        if (isRole(me.role)) {
          router.replace(homeHrefForRole(me.role) as Href);
          return;
        }

        await clearSessionToken();
        router.replace("/home" as Href);
      } catch (err) {
        if (cancelled) return;
        await clearSessionToken();
        const message = err instanceof Error ? err.message : "Não foi possível iniciar o app.";
        // Sem rede: ainda manda à home; mostra o erro na tela de espera um instante.
        setError(message);
        router.replace("/home" as Href);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.text}>{error ?? "Abrindo o LinkUP…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
