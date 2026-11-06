import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { enter } from "../theme/motion";

type Variant = "fade" | "fadeUp";

type Props = {
  children: ReactNode;
  /** fade = opacity only; fadeUp = opacity + slight upward travel */
  variant?: Variant;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * One-shot entrance on mount. Skips motion when the OS asks to reduce motion.
 * Mode switches (e.g. login/register tabs) do not remount — keep Enter outside
 * of that state so the animation does not replay.
 */
export function Enter({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = enter.duration,
  style,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

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

  if (reduceMotion || Platform.OS === "web") {
    return <View style={style}>{children}</View>;
  }

  const entering =
    variant === "fade"
      ? FadeIn.duration(duration).delay(delay)
      : FadeInDown.duration(duration).delay(delay);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
