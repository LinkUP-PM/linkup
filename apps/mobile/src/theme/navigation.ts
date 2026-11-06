import { colors, fonts, type } from "./tokens";
import { stackAnimations, type StackAnimation } from "./motion";

/** Shared stack / tab header options for the dark iOS look. */
export const screenHeaderOptions = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.accent,
  headerTitleStyle: {
    fontFamily: fonts.bodySemi,
    fontSize: type.headline.fontSize,
    color: colors.ink,
  },
  contentStyle: { backgroundColor: colors.background },
} as const;

export function withStackAnimation(animation: StackAnimation) {
  return { animation } as const;
}

export const stackScreenAnimations = {
  bootstrap: withStackAnimation(stackAnimations.bootstrap),
  home: withStackAnimation(stackAnimations.home),
  porta: withStackAnimation(stackAnimations.porta),
  login: withStackAnimation(stackAnimations.login),
  roleHome: withStackAnimation(stackAnimations.roleHome),
  detail: withStackAnimation(stackAnimations.detail),
} as const;

export const floatingTabBarStyle = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 16,
  height: 64,
  borderRadius: 28,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
  paddingTop: 6,
  paddingBottom: 6,
};
