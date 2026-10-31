import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SwitchRoleButton } from "./SwitchRoleButton";
import { colors, spacing } from "../theme/tokens";

export function ProfileHeaderButton() {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push("/perfil" as Href)}
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        accessibilityLabel="Perfil"
      >
        <Ionicons name="person-circle-outline" size={26} color={colors.accent} />
      </Pressable>
      <SwitchRoleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
