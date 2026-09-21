import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

type Props = ViewProps & {
  style?: ViewStyle;
  padded?: boolean;
};

export function Card({ children, style, padded = true, ...rest }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.lg,
  },
});
