import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/tokens";

/** Intrinsic logo.png aspect: height / width */
export const WORDMARK_RATIO = 312 / 1048;

export const brandLogoSizes = {
  compact: 168,
  footer: 120,
  header: 22,
  empty: 56,
  overlay: 56,
  loading: 168,
} as const;

type WordmarkProps = {
  variant: "wordmark";
  width: number;
  style?: StyleProp<ViewStyle>;
};

type MarkProps = {
  variant: "mark";
  size: number;
  /** Soft tile so the icon squircle reads on the black background. */
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
};

type Props = WordmarkProps | MarkProps;

export function BrandLogo(props: Props) {
  if (props.variant === "wordmark") {
    const height = props.width * WORDMARK_RATIO;
    return (
      <View style={props.style}>
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: props.width, height }}
          accessibilityLabel="LinkUP"
          resizeMode="contain"
        />
      </View>
    );
  }

  const { size, framed = false, style } = props;
  const corner = size * 0.21;
  const image = (
    <Image
      source={require("../../assets/icon.png")}
      style={{ width: size, height: size, borderRadius: corner }}
      accessibilityLabel="LinkUP"
      resizeMode="contain"
    />
  );

  if (!framed) {
    return <View style={style}>{image}</View>;
  }

  const pad = Math.round(size * 0.14);
  return (
    <View
      style={[
        styles.frame,
        {
          padding: pad,
          borderRadius: corner + pad,
        },
        style,
      ]}
    >
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
