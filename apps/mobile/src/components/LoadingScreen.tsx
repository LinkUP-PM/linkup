import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts, spacing } from "../theme/tokens";
import { BrandLogo, brandLogoSizes } from "./BrandLogo";

const ICON_SIZE = brandLogoSizes.loading;
const PULSE_MS = 1400;

type Props = {
  message?: string;
};

export function LoadingScreen({ message }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + progress.value * 0.08 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + progress.value * 0.35,
    transform: [{ scale: 0.85 + progress.value * 0.45 }],
  }));

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message ?? "Carregando"}>
      <View style={styles.stage}>
        {!reduceMotion ? <Animated.View style={[styles.glow, glowStyle]} /> : null}
        <Animated.View style={reduceMotion ? undefined : iconStyle}>
          <BrandLogo variant="mark" size={ICON_SIZE} />
        </Animated.View>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  stage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: ICON_SIZE * 0.72,
    height: ICON_SIZE * 0.72,
    borderRadius: ICON_SIZE,
    backgroundColor: colors.suggestions,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
