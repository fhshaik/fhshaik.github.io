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

/**
 * Deep night with a lamp-yellow accent — van Gogh's own palette, for 21333.
 */
export const STARRY_THEME: LegoTheme = {
  name: "starry",
  surface: "#0A1024",
  raised: "#141C36",
  ink: "#EDF1FF",
  muted: "#8792B8",
  line: "rgba(237, 241, 255, 0.16)",
  lineSoft: "rgba(237, 241, 255, 0.07)",
  // LDraw Yellow — the stars and the crescent moon.
  accent: "#FAC80A",
  accentInk: "#0A1024",
  baseplate: "dark-blue",
  scene: "#0A1024",
};

/** Fog grey with Golden Gate red. For the skylines. */
export const HARBOUR_THEME: LegoTheme = {
  name: "harbour",
  surface: "#12171A",
  raised: "#1B2226",
  ink: "#E7EDEF",
  muted: "#7C8A90",
  line: "rgba(231, 237, 239, 0.15)",
  lineSoft: "rgba(231, 237, 239, 0.06)",
  // LDraw Dark_Red, the Golden Gate's actual International Orange stand-in.
  accent: "#C9401F",
  accentInk: "#FFFFFF",
  baseplate: "dark-bluish-gray",
  scene: "#12171A",
};

/** Deep green and sand. For the gardens and botanicals. */
export const GARDEN_THEME: LegoTheme = {
  name: "garden",
  surface: "#0F1613",
  raised: "#18211D",
  ink: "#E9F0EA",
  muted: "#7E8F84",
  line: "rgba(233, 240, 234, 0.15)",
  lineSoft: "rgba(233, 240, 234, 0.06)",
  // LDraw Lime.
  accent: "#A5CA18",
  accentInk: "#0F1613",
  baseplate: "dark-green",
  scene: "#0F1613",
};

export const LEGO_THEMES = {
  studio: STUDIO_THEME,
  starry: STARRY_THEME,
  blossom: BLOSSOM_THEME,
  harbour: HARBOUR_THEME,
  garden: GARDEN_THEME,
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
