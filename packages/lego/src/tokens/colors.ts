/**
 * LEGO colour palette.
 *
 * Values are the official LDraw `!COLOUR` definitions, so a brick built with
 * this library and a part loaded from an LDraw/OMR model render in exactly the
 * same colour. `code` is the LDraw colour code — pass it to LDraw tooling, or
 * look a colour up by it with {@link colorByCode}.
 */

export type LegoFinish =
  | "solid"
  | "transparent"
  | "metallic"
  | "pearlescent"
  | "chrome";

export interface LegoColor {
  /** LDraw colour code, the canonical id shared with LDraw models. */
  code: number;
  /** Token name — used for props, and for the `--lego-color-*` CSS variables. */
  name: LegoColorName;
  /** Human label, e.g. for a palette legend. */
  label: string;
  /** Surface colour, sRGB hex. */
  hex: string;
  /** LDraw edge colour — used for outlines and 2D bevel shading. */
  edge: string;
  /** 0–1. Below 1 for the `trans-*` colours. */
  alpha: number;
  finish: LegoFinish;
}

type ColorSeed = [
  code: number,
  name: string,
  label: string,
  hex: string,
  edge: string,
  alpha?: number,
  finish?: LegoFinish,
];

const SEEDS = [
  [0, "black", "Black", "#1B2A34", "#808080"],
  [1, "blue", "Blue", "#1E5AA8", "#333333"],
  [2, "green", "Green", "#00852B", "#333333"],
  [4, "red", "Red", "#B40000", "#333333"],
  [5, "dark-pink", "Dark Pink", "#D3359D", "#333333"],
  [6, "brown", "Brown", "#543324", "#1E1E1E"],
  [14, "yellow", "Yellow", "#FAC80A", "#333333"],
  [15, "white", "White", "#F4F4F4", "#333333"],
  [19, "tan", "Tan", "#D7BA8C", "#333333"],
  [25, "orange", "Orange", "#D67923", "#333333"],
  [26, "magenta", "Magenta", "#901F76", "#333333"],
  [27, "lime", "Lime", "#A5CA18", "#333333"],
  [28, "dark-tan", "Dark Tan", "#897D62", "#333333"],
  [29, "bright-pink", "Bright Pink", "#FF9ECD", "#333333"],
  [31, "lavender", "Lavender", "#CDA4DE", "#333333"],
  [68, "very-light-orange", "Very Light Orange", "#FDC383", "#333333"],
  [70, "reddish-brown", "Reddish Brown", "#5F3109", "#808080"],
  [71, "light-bluish-gray", "Light Bluish Gray", "#969696", "#333333"],
  [72, "dark-bluish-gray", "Dark Bluish Gray", "#646464", "#333333"],
  [73, "medium-blue", "Medium Blue", "#7396C8", "#333333"],
  [84, "medium-nougat", "Medium Nougat", "#AA7D55", "#333333"],
  [85, "medium-lilac", "Medium Lilac", "#441A91", "#333333"],
  [191, "bright-light-orange", "Bright Light Orange", "#FCAC00", "#333333"],
  [212, "bright-light-blue", "Bright Light Blue", "#9DC3F7", "#333333"],
  [226, "bright-light-yellow", "Bright Light Yellow", "#FFEC6C", "#333333"],
  [272, "dark-blue", "Dark Blue", "#19325A", "#333333"],
  [288, "dark-green", "Dark Green", "#00451A", "#808080"],
  [308, "dark-brown", "Dark Brown", "#352100", "#808080"],
  [320, "dark-red", "Dark Red", "#720012", "#333333"],
  [322, "medium-azure", "Medium Azure", "#68C3E2", "#333333"],
  [323, "light-aqua", "Light Aqua", "#D3F2EA", "#333333"],
  [326, "yellowish-green", "Yellowish Green", "#E2F99A", "#333333"],
  [335, "sand-red", "Sand Red", "#88605E", "#333333"],
  [351, "medium-dark-pink", "Medium Dark Pink", "#F785B1", "#333333"],
  [366, "earth-orange", "Earth Orange", "#D86D2C", "#333333"],
  [373, "sand-purple", "Sand Purple", "#75657D", "#333333"],
  [378, "sand-green", "Sand Green", "#708E7C", "#333333"],
  [379, "sand-blue", "Sand Blue", "#70819A", "#333333"],
  [450, "fabuland-brown", "Fabuland Brown", "#D27744", "#333333"],
  [484, "dark-orange", "Dark Orange", "#91501C", "#333333"],
  [47, "trans-clear", "Trans Clear", "#FCFCFC", "#C9C9C9", 0.5, "transparent"],
  [33, "trans-dark-blue", "Trans Dark Blue", "#0020A0", "#000B38", 0.5, "transparent"],
  [36, "trans-red", "Trans Red", "#C91A09", "#660D05", 0.5, "transparent"],
  [34, "trans-green", "Trans Green", "#237841", "#174F2B", 0.5, "transparent"],
  [43, "trans-light-blue", "Trans Light Blue", "#AEE9EF", "#59D1DE", 0.5, "transparent"],
  [40, "trans-brown", "Trans Brown", "#635F52", "#2A2823", 0.5, "transparent"],
  [297, "pearl-gold", "Pearl Gold", "#AA7F2E", "#333333", 1, "pearlescent"],
  [80, "metallic-silver", "Metallic Silver", "#767676", "#333333", 1, "metallic"],
  [383, "chrome-silver", "Chrome Silver", "#CECECE", "#9C9C9C", 1, "chrome"],
] as const satisfies readonly ColorSeed[];

export type LegoColorName = (typeof SEEDS)[number][1];

function toColor(seed: ColorSeed): LegoColor {
  const [code, name, label, hex, edge, alpha = 1, finish = "solid"] = seed;
  return { code, name: name as LegoColorName, label, hex, edge, alpha, finish };
}

export const LEGO_COLORS: Record<LegoColorName, LegoColor> = Object.fromEntries(
  SEEDS.map((seed) => [seed[1], toColor(seed as unknown as ColorSeed)]),
) as Record<LegoColorName, LegoColor>;

export const LEGO_COLOR_LIST: readonly LegoColor[] = Object.values(LEGO_COLORS);

const BY_CODE = new Map(LEGO_COLOR_LIST.map((color) => [color.code, color]));

/** Look a colour up by its LDraw code (e.g. `4` → Red). */
export function colorByCode(code: number): LegoColor | undefined {
  return BY_CODE.get(code);
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Accepts a palette name (`"red"`), an LDraw code (`4`), or a raw hex string
 * (`"#ff0000"`) and always returns a usable {@link LegoColor}. A raw hex gets a
 * derived edge colour so custom colours still shade correctly in the 2D kit.
 */
export function resolveColor(input: LegoColorName | number | string): LegoColor {
  if (typeof input === "number") {
    const found = colorByCode(input);
    if (!found) throw new Error(`Unknown LDraw colour code: ${input}`);
    return found;
  }
  const known = LEGO_COLORS[input as LegoColorName];
  if (known) return known;
  if (HEX_PATTERN.test(input)) {
    return {
      code: -1,
      name: input as LegoColorName,
      label: input,
      hex: input,
      edge: shade(input, -0.45),
      alpha: 1,
      finish: "solid",
    };
  }
  throw new Error(`Unknown LEGO colour: ${input}`);
}

/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex colour. */
export function shade(hex: string, amount: number): string {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const value = Number.parseInt(full.slice(1), 16);
  const channel = (shift: number) => {
    const base = (value >> shift) & 0xff;
    const next = amount >= 0 ? base + (255 - base) * amount : base * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, next)));
  };
  return `#${[16, 8, 0]
    .map((shift) => channel(shift).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** `rgba()` string for a colour, honouring its alpha. */
export function rgba(color: LegoColor, alpha = color.alpha): string {
  const value = Number.parseInt(color.hex.slice(1), 16);
  return `rgba(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff}, ${alpha})`;
}
