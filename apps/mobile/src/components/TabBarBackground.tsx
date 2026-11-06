import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius } from "../theme/tokens";

/** Floating capsule behind the tab bar (Liquid Glass–inspired). */
export function TabBarBackground() {
  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, styles.fill, styles.clip]} />;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
        {...(Platform.OS === "android"
          ? { experimentalBlurMethod: "dimezisBlurView" as const }
          : {})}
      />
      <View style={[StyleSheet.absoluteFill, styles.fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: radius.capsule,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.tabBarFill,
  },
});
