"use client";

import type { CSSProperties } from "react";
import { resolveColor, type LegoColorName } from "../tokens/colors";

export type UiColor = LegoColorName | string;

/** Resolves a palette name, LDraw code, or hex to a CSS colour value. */
export function legoColorValue(color: UiColor): string {
  const resolved = resolveColor(color);
  return `var(--lego-color-${resolved.name}, ${resolved.hex})`;
}

export interface StudMarkProps {
  /** Defaults to the theme accent. */
  color?: UiColor;
  /** Diameter in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A single stud, used as punctuation — a bullet, an active-state marker, a
 * mark beside a label. The LEGO reference lands harder for being used once
 * than for being stamped on every surface.
 */
export function StudMark({ color, size, className, style }: StudMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={["lego-stud-mark", className].filter(Boolean).join(" ")}
      style={
        {
          ...(color ? { "--lego-mark-color": legoColorValue(color) } : {}),
          ...(size ? { "--lego-mark-size": `${size}px` } : {}),
          ...style,
        } as CSSProperties
      }
    />
  );
}
