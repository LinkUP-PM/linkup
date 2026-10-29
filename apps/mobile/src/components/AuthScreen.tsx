import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import type { Role } from "@linkup/shared";
import { ROLE_LABELS } from "@linkup/shared";
import { login, register } from "../lib/api";
import { homeHrefForRole } from "../lib/role";
import { enter } from "../theme/motion";
import { colors, fonts, radius, spacing, type } from "../theme/tokens";
import { Enter } from "./Enter";
import { GroupedSection } from "./GroupedSection";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  role: Role;
  description: string;
};

export function AuthScreen({ role, description }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 8 &&
    (mode === "login" || password === confirm);

  async function submit() {
    setError(null);
    if (mode === "register" && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        role,
      };
      const result = mode === "register" ? await register(payload) : await login(payload);
      router.replace(homeHrefForRole(result.user.role) as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar.");
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, spacing.xl),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Text style={styles.backLabel}>Voltar</Text>
        </Pressable>

        <Enter variant="fadeUp" delay={enter.delays.header}>
          <Text style={styles.brand}>LinkUP</Text>
          <Text style={styles.title}>{ROLE_LABELS[role]}</Text>
          <Text style={styles.body}>{description}</Text>
        </Enter>

        <Enter variant="fadeUp" delay={enter.delays.list} style={styles.formEnter}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => {
                setMode("login");
                setError(null);
              }}
              style={[styles.tab, mode === "login" && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, mode === "login" && styles.tabLabelActive]}>
                Entrar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode("register");
                setError(null);
              }}
              style={[styles.tab, mode === "register" && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, mode === "register" && styles.tabLabelActive]}>
                Criar conta
              </Text>
            </Pressable>
          </View>

          <GroupedSection header="Conta" style={styles.section}>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@empresa.com"
                placeholderTextColor={colors.tertiary}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!busy}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.tertiary}
                style={styles.input}
                secureTextEntry
                textContentType={mode === "register" ? "newPassword" : "password"}
                editable={!busy}
              />
            </View>
            {mode === "register" ? (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Confirmar</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repita a senha"
                  placeholderTextColor={colors.tertiary}
                  style={styles.input}
                  secureTextEntry
                  textContentType="newPassword"
                  editable={!busy}
                />
              </View>
            ) : null}
          </GroupedSection>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={mode === "register" ? "Criar conta" : "Entrar"}
            onPress={() => void submit()}
            disabled={busy || !canSubmit}
            style={styles.submit}
          />
        </Enter>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  formEnter: {
    gap: spacing.md,
  },
  back: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  backLabel: {
    ...type.headline,
    color: colors.accent,
  },
  brand: {
    ...type.footnote,
    fontFamily: fonts.bodySemi,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.control,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabLabel: {
    ...type.subhead,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.ink,
  },
  section: {
    marginTop: spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    gap: spacing.md,
  },
  label: {
    ...type.body,
    color: colors.ink,
    width: 88,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.ink,
    paddingVertical: spacing.md,
    textAlign: "right",
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
