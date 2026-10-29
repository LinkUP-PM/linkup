import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius, spacing, type } from "../theme/tokens";

type Props = {
  header?: string;
  footer?: string;
  children: ReactNode;
  style?: ViewStyle;
};

/** Inset grouped list (Settings-style): header footnote + surface with hairline dividers. */
export function GroupedSection({ header, footer, children, style }: Props) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.wrap, style]}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      <View style={styles.group}>
        {items.map((child, index) => (
          <Fragment key={isValidElement(child) && child.key != null ? child.key : index}>
            {index > 0 ? <View style={styles.separator} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

type RowProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function GroupedRow({ children, style }: RowProps) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    ...type.footnote,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  footer: {
    ...type.footnote,
    color: colors.muted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
});
