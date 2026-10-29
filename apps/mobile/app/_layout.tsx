import "react-native-reanimated";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { getDb } from "../src/lib/db";
import { colors } from "../src/theme/tokens";
import { screenHeaderOptions, stackScreenAnimations } from "../src/theme/navigation";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getDb()
      .then(() => {
        if (!cancelled) setDbReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDbError(err instanceof Error ? err.message : "Não foi possível abrir os dados locais.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = Platform.OS === "ios" ? dbReady : fontsLoaded && dbReady;

  if (dbError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.ink, textAlign: "center", fontSize: 16, lineHeight: 22 }}>{dbError}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={screenHeaderOptions}>
        <Stack.Screen name="index" options={{ headerShown: false, ...stackScreenAnimations.bootstrap }} />
        <Stack.Screen name="home" options={{ headerShown: false, ...stackScreenAnimations.home }} />
        <Stack.Screen name="porta" options={{ headerShown: false, ...stackScreenAnimations.porta }} />
        <Stack.Screen name="login/candidato" options={{ headerShown: false, ...stackScreenAnimations.login }} />
        <Stack.Screen name="login/recrutador" options={{ headerShown: false, ...stackScreenAnimations.login }} />
        <Stack.Screen name="login/contratante" options={{ headerShown: false, ...stackScreenAnimations.login }} />
        <Stack.Screen name="(candidate)" options={{ headerShown: false, ...stackScreenAnimations.roleHome }} />
        <Stack.Screen name="(employer)" options={{ headerShown: false, ...stackScreenAnimations.roleHome }} />
        <Stack.Screen name="(recruiter)" options={{ headerShown: false, ...stackScreenAnimations.roleHome }} />
        <Stack.Screen
          name="vaga/[id]"
          options={{
            title: "Vaga",
            headerBackTitle: "Voltar",
            ...stackScreenAnimations.detail,
          }}
        />
        <Stack.Screen
          name="candidatura/[id]"
          options={{
            title: "Candidatura",
            headerBackTitle: "Voltar",
            ...stackScreenAnimations.detail,
          }}
        />
        <Stack.Screen
          name="analise/[id]"
          options={{
            title: "Análise",
            headerBackTitle: "Voltar",
            ...stackScreenAnimations.detail,
          }}
        />
        <Stack.Screen
          name="dossie/[id]"
          options={{
            title: "Dossiê",
            headerBackTitle: "Voltar",
            ...stackScreenAnimations.detail,
          }}
        />
      </Stack>
    </>
  );
}
