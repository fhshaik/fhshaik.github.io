import * as THREE from "three";
import { resolveColor, type LegoColor, type LegoColorName } from "../tokens/colors";

export type ColorInput = LegoColorName | number | string | LegoColor;

/** Per-finish plastic response. Tuned to read as ABS under a studio key light. */
const FINISH = {
  solid: { roughness: 0.38, metalness: 0.0, clearcoat: 0.25 },
  transparent: { roughness: 0.12, metalness: 0.0, clearcoat: 0.6 },
  metallic: { roughness: 0.28, metalness: 0.85, clearcoat: 0.2 },
  pearlescent: { roughness: 0.34, metalness: 0.55, clearcoat: 0.45 },
  chrome: { roughness: 0.06, metalness: 1.0, clearcoat: 0.0 },
} as const;

const CACHE = new Map<string, THREE.MeshPhysicalMaterial>();

export function toLegoColor(input: ColorInput): LegoColor {
  return typeof input === "object" ? input : resolveColor(input);
}

/**
 * Material for a colour. Cached and shared across every brick using it — this
 * is what lets the stage batch bricks into instanced draw calls.
 */
export function partMaterial(input: ColorInput): THREE.MeshPhysicalMaterial {
  const color = toLegoColor(input);
  const key = `${color.hex}|${color.finish}|${color.alpha}`;
  const cached = CACHE.get(key);
  if (cached) return cached;

  const profile = FINISH[color.finish];
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color.hex),
    roughness: profile.roughness,
    metalness: profile.metalness,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: 0.28,
    transparent: color.alpha < 1,
    opacity: color.alpha,
    depthWrite: color.alpha >= 1,
    side: THREE.FrontSide,
  });
  material.name = `lego-${color.name}`;
  CACHE.set(key, material);
  return material;
}

/** Stable batch key for a colour — bricks sharing it can be instanced together. */
export function materialKey(input: ColorInput): string {
  const color = toLegoColor(input);
  return `${color.hex}|${color.finish}|${color.alpha}`;
}

let ghost: THREE.MeshBasicMaterial | undefined;

/**
 * Fully transparent, still raycastable. Backs {@link Hotspot}-style pick
 * volumes: invisible in the render, solid to the pointer.
 */
export function ghostMaterial(): THREE.MeshBasicMaterial {
  ghost ??= new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  return ghost;
}

export function disposeMaterialCache(): void {
  ghost?.dispose();
  ghost = undefined;
  for (const material of CACHE.values()) material.dispose();
  CACHE.clear();
}
