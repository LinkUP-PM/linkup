import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { logout } from "../lib/api";
import { colors, fonts, spacing } from "../theme/tokens";

type Props = {
  label?: string;
};

export function SwitchRoleButton({ label = "Sair" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace("/porta" as Href);
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={() => void onPress()}
      disabled={busy}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.accent,
  },
});
