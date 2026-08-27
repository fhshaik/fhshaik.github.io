import * as THREE from "three";

export interface HaloSpec {
  /** Position in raw LDraw units, as read from the model. */
  position: [number, number, number];
  /** Halo diameter in LDraw units. */
  size: number;
  /** Core colour. */
  color?: string;
  /** Brightness. 1 is a lit star; 2 is the moon. */
  intensity?: number;
}

/**
 * A soft radial falloff, drawn once and shared by every halo.
 *
 * Two stops do the work: a small bright core and a long tail that reaches zero
 * well inside the sprite, so the glow has no visible edge. The curve is
 * deliberately not linear — light falls off fast near the source and slowly
 * after, and a linear ramp reads as a flat disc.
 */
function haloTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a 2D context for the halo texture");

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Banded, not gaussian. Van Gogh draws a corona as concentric rings of
  // pigment, and a smooth falloff reads as lens fog instead — which is exactly
  // what an earlier version looked like.
  gradient.addColorStop(0.0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.13, "rgba(255,255,255,0.86)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.3)");
  // First ring.
  gradient.addColorStop(0.28, "rgba(255,255,255,0.46)");
  gradient.addColorStop(0.36, "rgba(255,255,255,0.14)");
  // Second, fainter ring.
  gradient.addColorStop(0.46, "rgba(255,255,255,0.22)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.06)");
  gradient.addColorStop(0.78, "rgba(255,255,255,0.02)");
  gradient.addColorStop(1.0, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let shared: THREE.Texture | undefined;

/**
 * Builds the glows around a model's light sources.
 *
 * These are billboarded sprites, not emissive bricks. Making a brick emissive
 * only brightens the brick; the halo *around* a star is the thing that reads as
 * light, and it is the signature of the painting this was written for. Sprites
 * also let each light be sized and tuned individually, which colour-matching
 * bricks could never do.
 *
 * Positions are given in LDraw coordinates and flipped here to match a model
 * loaded with the usual y-down correction.
 */
export function createHalos(specs: readonly HaloSpec[], options: { flip?: boolean } = {}): THREE.Group {
  const flip = options.flip ?? true;
  shared ??= haloTexture();

  const group = new THREE.Group();
  group.name = "lego-halos";

  for (const spec of specs) {
    const material = new THREE.SpriteMaterial({
      map: shared,
      color: new THREE.Color(spec.color ?? "#FFE08A"),
      transparent: true,
      // Additive, so overlapping halos build up the way glazed light does
      // instead of occluding one another.
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // Additive blending accumulates: eighteen halos at half opacity add up to
      // white sky. Kept low so a cluster reads as glow, not as fog.
      opacity: Math.min(1, (spec.intensity ?? 1) * 0.22),
    });

    const sprite = new THREE.Sprite(material);
    const [x, y, z] = spec.position;
    sprite.position.set(x, flip ? -y : y, flip ? -z : z);
    sprite.scale.setScalar(spec.size);
    // Draw after the bricks: these are light in the air, not surfaces.
    sprite.renderOrder = 10;
    group.add(sprite);
  }

  return group;
}

/** Frees the shared halo texture. */
export function disposeHaloTexture(): void {
  shared?.dispose();
  shared = undefined;
}
