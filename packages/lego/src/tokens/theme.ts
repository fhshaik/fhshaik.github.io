import type { LegoColorName } from "./colors";

/**
 * Surface roles.
 *
 * Deliberately near-monochrome with a single saturated accent. The LEGO in the
 * page comes from the sets in the scene and from how things move — not from
 * colouring every control, which reads as a toy rather than a product.
 */
export interface LegoTheme {
  name: string;
  /** Page ground. */
  surface: string;
  /** Raised panel. Barely separated from `surface`. */
  raised: string;
  /** Primary text. */
  ink: string;
  /** Secondary text and small labels. */
  muted: string;
  /** Hairlines. */
  line: string;
  /** Fainter hairlines, for large areas. */
  lineSoft: string;
  /** The one accent. Used sparingly. */
  accent: string;
  /** Text on the accent. */
  accentInk: string;
  /** Baseplate under a set in the 3D scene. */
  baseplate: LegoColorName;
  /** Scene background, matched to `surface` so the canvas is the page. */
  scene: string;
}

/**
 * Dark, near-monochrome, one red. The default: a set lit against a dark ground
 * reads like a product shot rather than a beige illustration.
 */
export const STUDIO_THEME: LegoTheme = {
  name: "studio",
  surface: "#0E1418",
  raised: "#161F24",
  ink: "#E8EFEB",
  muted: "#7E8C89",
  line: "rgba(232, 239, 235, 0.14)",
  lineSoft: "rgba(232, 239, 235, 0.06)",
  // LDraw Trans_Red — the brightest true red in the official palette.
  accent: "#C91A09",
  accentInk: "#FFFFFF",
  baseplate: "black",
  scene: "#0E1418",
};

/** Light alternative. Same restraint, inverted. */
export const DAYLIGHT_THEME: LegoTheme = {
  name: "daylight",
  surface: "#EDEAE4",
  raised: "#F7F5F1",
  ink: "#12181B",
  muted: "#6C7671",
  line: "rgba(18, 24, 27, 0.16)",
  lineSoft: "rgba(18, 24, 27, 0.07)",
  accent: "#B40000",
  accentInk: "#FFFFFF",
  baseplate: "light-bluish-gray",
  scene: "#EDEAE4",
};

/**
 * Dark plum. Built for a blossom scene: the ground is warm enough that pink
 * petals read against it, and the accent is the blossom pink itself.
 */
export const BLOSSOM_THEME: LegoTheme = {
  name: "blossom",
  surface: "#221A1E",
  raised: "#2C2228",
  ink: "#F4EBEE",
  muted: "#A2919A",
  line: "rgba(244, 235, 238, 0.15)",
  lineSoft: "rgba(244, 235, 238, 0.07)",
  // LDraw Bright_Pink — the blossom colour in 10281.
  accent: "#FF9ECD",
  accentInk: "#221A1E",
  baseplate: "dark-brown",
  scene: "#221A1E",
};

export const LEGO_THEMES = {
  studio: STUDIO_THEME,
  blossom: BLOSSOM_THEME,
  daylight: DAYLIGHT_THEME,
} as const;

export type LegoThemeName = keyof typeof LEGO_THEMES;

/**
 * Motion tokens.
 *
 * Springs rather than linear fades. `press` is intentionally asymmetric: a
 * brick drops onto a stud fast and settles slowly, and matching that is what
 * makes a control feel like a brick without drawing one.
 */
export const LEGO_MOTION = {
  /** Decelerating entry. */
  glide: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Overshoots then settles — a critically damped spring. */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Snappy, symmetric. For underlines and strokes. */
  snap: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** Time a control takes to compress under a press. */
  pressDown: "80ms",
  /** Time it takes to spring back. */
  pressUp: "500ms",
  /** Standard transition length. */
  base: "420ms",
  /** Long, for reveals. */
  slow: "620ms",
} as const;
