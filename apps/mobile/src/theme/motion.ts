/** Stack + content entrance presets — tweak per screen after trying in the app. */

export type StackAnimation =
  | "default"
  | "fade"
  | "fade_from_bottom"
  | "slide_from_right"
  | "slide_from_left"
  | "slide_from_bottom"
  | "none";

export const stackAnimations = {
  bootstrap: "none",
  home: "fade",
  porta: "fade_from_bottom",
  login: "slide_from_right",
  roleHome: "none",
  detail: "slide_from_right",
} as const satisfies Record<string, StackAnimation>;

export const enter = {
  duration: 280,
  /** Slight upward travel for FadeInDown. */
  distance: 12,
  delays: {
    logo: 0,
    body: 60,
    cta: 140,
    header: 0,
    list: 80,
  },
} as const;
