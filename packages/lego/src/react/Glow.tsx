"use client";

import { useEffect } from "react";
import type { ColorInput } from "../core/materials";
import { useLegoStage } from "./context";

export interface GlowProps {
  /** LEGO colours that should emit light — e.g. the stars in 21333. */
  colors: readonly ColorInput[];
  /** Emissive strength. Around 1 reads as lit; 2+ is a lamp. */
  intensity?: number;
  /**
   * Slow brightness oscillation, as a fraction of `intensity`. 0 holds steady.
   * Each material gets its own phase, so they do not pulse in unison.
   */
  twinkle?: number;
  /** Oscillations per second. */
  speed?: number;
}

/**
 * Lights the given colours from within.
 *
 * With bloom enabled on the canvas, the stars and moon of a night scene stop
 * being yellow tiles and start being light sources. The twinkle is deliberately
 * slow and shallow — a flicker reads as a bug, a drift reads as air.
 */
export function Glow({ colors, intensity = 1.15, twinkle = 0.3, speed = 0.22 }: GlowProps) {
  const stage = useLegoStage();
  const key = colors.join(",");

  useEffect(() => {
    if (!stage) return;

    // Wait a frame: the model's materials must be in the scene to be found.
    let stop: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      const materials = stage.setGlow(key.split(","), intensity);
      if (materials.length === 0 || twinkle <= 0) return;

      const reduced =
        typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      // A fixed phase per material, derived from its index, so the pattern is
      // stable across reloads.
      const phases = materials.map((_, index) => (index * 2.399963) % (Math.PI * 2));
      let elapsed = 0;

      stop = stage.addUpdater((delta) => {
        elapsed += delta;
        materials.forEach((material, index) => {
          const wave = Math.sin(elapsed * speed * Math.PI * 2 + phases[index]);
          material.emissiveIntensity = intensity * (1 + wave * twinkle);
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, [stage, key, intensity, twinkle, speed]);

  return null;
}
