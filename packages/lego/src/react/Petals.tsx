"use client";

import { useEffect } from "react";
import { PetalField, type PetalFieldOptions } from "../core/petals";
import { useLegoStage } from "./context";

export interface PetalsProps extends PetalFieldOptions {
  /**
   * Skip the field under `prefers-reduced-motion`. Defaults to true — a
   * continuous particle animation is exactly what that setting is asking about.
   */
  respectReducedMotion?: boolean;
}

/**
 * Falling LEGO petals in the enclosing canvas.
 *
 * ```tsx
 * <LegoCanvas>
 *   <LDrawModel src={set.url} />
 *   <Petals count={180} />
 * </LegoCanvas>
 * ```
 */
export function Petals({ respectReducedMotion = true, ...options }: PetalsProps) {
  const stage = useLegoStage();

  const {
    count,
    area,
    height,
    speed,
    sway,
    size,
    flatten,
    seed,
    colors,
  } = options;

  // Serialised so an inline `colors` array does not rebuild the field.
  const colorKey = colors ? colors.join(",") : "";

  useEffect(() => {
    if (!stage) return;
    if (
      respectReducedMotion &&
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const field = new PetalField(stage, {
      count,
      area,
      height,
      speed,
      sway,
      size,
      flatten,
      seed,
      colors: colorKey ? colorKey.split(",") : undefined,
    });

    return () => field.dispose();
  }, [
    stage,
    respectReducedMotion,
    count,
    area,
    height,
    speed,
    sway,
    size,
    flatten,
    seed,
    colorKey,
  ]);

  return null;
}
