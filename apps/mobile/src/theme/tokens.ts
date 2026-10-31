import { Platform } from "react-native";

/** iOS system fonts; Inter elsewhere (loaded in root layout). */
const ios = Platform.OS === "ios";

export const colors = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceElevated: "#2C2C2E",
  ink: "#FFFFFF",
  muted: "rgba(235, 235, 245, 0.6)",
  tertiary: "rgba(235, 235, 245, 0.3)",
  accent: "#0A84FF",
  accentSoft: "rgba(10, 132, 255, 0.16)",
  border: "rgba(84, 84, 88, 0.65)",
  separator: "rgba(84, 84, 88, 0.65)",
  error: "#FF453A",
  errorSoft: "rgba(255, 69, 58, 0.16)",
  strengths: "#30D158",
  strengthsSoft: "rgba(48, 209, 88, 0.16)",
  attention: "#FFD60A",
  attentionSoft: "rgba(255, 214, 10, 0.16)",
  suggestions: "#64D2FF",
  suggestionsSoft: "rgba(100, 210, 255, 0.16)",
  white: "#FFFFFF",
  scrim: "rgba(0, 0, 0, 0.55)",
  tabBarFill: "rgba(28, 28, 30, 0.92)",
} as const;

export const radius = {
  card: 12,
  group: 12,
  button: 14,
  control: 14,
  pill: 999,
  input: 10,
  capsule: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Space reserved above floating tab bar */
  tabBarClearance: 88,
} as const;

export const fonts = {
  display: ios ? "System" : "Inter_600SemiBold",
  displayBold: ios ? "System" : "Inter_700Bold",
  body: ios ? "System" : "Inter_400Regular",
  bodyMedium: ios ? "System" : "Inter_500Medium",
  bodySemi: ios ? "System" : "Inter_600SemiBold",
  bodyBold: ios ? "System" : "Inter_700Bold",
} as const;

/** iOS-aligned type scale */
export const type = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontFamily: fonts.displayBold,
    fontWeight: ios ? ("700" as const) : undefined,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.displayBold,
    fontWeight: ios ? ("700" as const) : undefined,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.displayBold,
    fontWeight: ios ? ("700" as const) : undefined,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: fonts.bodySemi,
    fontWeight: ios ? ("600" as const) : undefined,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.bodySemi,
    fontWeight: ios ? ("600" as const) : undefined,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.body,
    fontWeight: ios ? ("400" as const) : undefined,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: fonts.body,
    fontWeight: ios ? ("400" as const) : undefined,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.body,
    fontWeight: ios ? ("400" as const) : undefined,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
    fontWeight: ios ? ("400" as const) : undefined,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.body,
    fontWeight: ios ? ("400" as const) : undefined,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.bodyMedium,
    fontWeight: ios ? ("500" as const) : undefined,
  },
} as const;
