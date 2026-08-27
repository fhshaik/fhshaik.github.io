import { LEGO_COLOR_LIST, rgba, shade } from "./colors";
import { UI_DEFAULT_PITCH, UI_RATIOS } from "./dimensions";
import { LEGO_MOTION, LEGO_THEMES, type LegoTheme, type LegoThemeName } from "./theme";

export interface TokenCssOptions {
  /**
   * Size of one stud pitch. Every 2D measurement is derived from it, so this
   * one value scales the entire UI kit. Defaults to `1.75rem`.
   */
  pitch?: string;
  /** Theme applied at `:root`. Defaults to `studio`. */
  theme?: LegoThemeName;
  /**
   * Also emit `[data-lego-theme="..."]` blocks for every theme, so a page can
   * switch themes by setting one attribute. Defaults to `true`.
   */
  includeThemeSelectors?: boolean;
  /** Selector the base tokens are attached to. Defaults to `:root`. */
  selector?: string;
}

function themeBlock(theme: LegoTheme): string {
  return [
    `--lego-surface:${theme.surface};`,
    `--lego-raised:${theme.raised};`,
    `--lego-ink:${theme.ink};`,
    `--lego-muted:${theme.muted};`,
    `--lego-line:${theme.line};`,
    `--lego-line-soft:${theme.lineSoft};`,
    `--lego-accent:${theme.accent};`,
    `--lego-accent-ink:${theme.accentInk};`,
    `--lego-baseplate:var(--lego-color-${theme.baseplate});`,
    `--lego-scene:${theme.scene};`,
  ].join("");
}

/**
 * The single source of truth, rendered as CSS custom properties.
 *
 * Both halves of the library read the same tokens: the three.js side imports
 * the TypeScript values directly, the 2D kit reads these variables. Render the
 * result into a `<style>` tag (server-side, so there is no flash) or call
 * {@link injectLegoTokens} in the browser.
 */
export function legoTokensCss(options: TokenCssOptions = {}): string {
  const {
    pitch = UI_DEFAULT_PITCH,
    theme = "studio",
    includeThemeSelectors = true,
    selector = ":root",
  } = options;

  const colorVars = LEGO_COLOR_LIST.flatMap((color) => [
    `--lego-color-${color.name}:${color.hex};`,
    `--lego-edge-${color.name}:${color.edge};`,
    `--lego-top-${color.name}:${shade(color.hex, 0.22)};`,
    `--lego-side-${color.name}:${shade(color.hex, -0.16)};`,
    ...(color.alpha < 1 ? [`--lego-fill-${color.name}:${rgba(color)};`] : []),
  ]).join("");

  const motion = [
    `--lego-ease-glide:${LEGO_MOTION.glide};`,
    `--lego-ease-spring:${LEGO_MOTION.spring};`,
    `--lego-ease-snap:${LEGO_MOTION.snap};`,
    `--lego-press-down:${LEGO_MOTION.pressDown};`,
    `--lego-press-up:${LEGO_MOTION.pressUp};`,
    `--lego-duration:${LEGO_MOTION.base};`,
    `--lego-duration-slow:${LEGO_MOTION.slow};`,
  ].join("");

  // Ratios are derived from LDU division, so round them: an unrounded
  // 0.6000000000000001 in a calc() is just noise in the output.
  const ratio = (value: number) => Number(value.toFixed(4));

  const metrics = [
    `--lego-pitch:${pitch};`,
    `--lego-stud:calc(var(--lego-pitch) * ${ratio(UI_RATIOS.stud)});`,
    `--lego-stud-rise:calc(var(--lego-pitch) * ${ratio(UI_RATIOS.studRise)});`,
    `--lego-brick-height:calc(var(--lego-pitch) * ${ratio(UI_RATIOS.brick)});`,
    `--lego-plate-height:calc(var(--lego-pitch) * ${ratio(UI_RATIOS.plate)});`,
    `--lego-radius:calc(var(--lego-pitch) * ${ratio(UI_RATIOS.radius * 4)});`,
    `--lego-gap:calc(var(--lego-pitch) * 0.14);`,
  ].join("");

  const base = `${selector}{${colorVars}${metrics}${motion}${themeBlock(LEGO_THEMES[theme])}}`;

  if (!includeThemeSelectors) return base;

  const themed = Object.values(LEGO_THEMES)
    .map((entry) => `[data-lego-theme="${entry.name}"]{${themeBlock(entry)}}`)
    .join("");

  return `${base}${themed}`;
}

const STYLE_ID = "lego-tokens";

/**
 * Browser-side alternative to rendering {@link legoTokensCss} server-side.
 * Idempotent — calling it again replaces the previous token block.
 */
export function injectLegoTokens(options: TokenCssOptions = {}): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  const style = existing ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = legoTokensCss(options);
  if (!existing) document.head.prepend(style);
}

export {
  STUDIO_THEME,
  STARRY_THEME,
  BLOSSOM_THEME,
  HARBOUR_THEME,
  GARDEN_THEME,
  DAYLIGHT_THEME,
  LEGO_THEMES,
  LEGO_MOTION,
} from "./theme";
export type { LegoTheme, LegoThemeName } from "./theme";
