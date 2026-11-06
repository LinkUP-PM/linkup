import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme/tokens";
import { BrandLogo, brandLogoSizes } from "./BrandLogo";

type Props = {
  title: string;
};

/** Check mark + screen title for role home headers (no back chevron). */
export function BrandHeaderTitle({ title }: Props) {
  return (
    <View style={styles.row}>
      <BrandLogo variant="mark" size={brandLogoSizes.header} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  title: {
    ...type.headline,
    color: colors.ink,
    flexShrink: 1,
  },
});
