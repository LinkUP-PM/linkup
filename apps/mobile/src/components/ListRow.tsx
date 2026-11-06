import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, type } from "../theme/tokens";

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  accessory?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
};

/** Single row for inset grouped lists (title + optional meta / chevron). */
export function ListRow({
  title,
  subtitle,
  meta,
  accessory,
  onPress,
  showChevron = true,
  style,
}: Props) {
  const content = (
    <View style={[styles.row, style]}>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.tertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.body,
    color: colors.ink,
  },
  subtitle: {
    ...type.footnote,
    color: colors.muted,
  },
  meta: {
    ...type.footnote,
    color: colors.tertiary,
  },
  accessory: {
    marginRight: spacing.xs,
  },
});
