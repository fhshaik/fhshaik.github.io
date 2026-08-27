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
  /**
   * Fraction of the halo's radius left fully transparent in the middle, 0–1.
   *
   * A halo over an already-bright surface does not brighten it — the added
   * light pushes it into the tone-mapping shoulder, which desaturates it, so a
   * glow laid over the moon reads as a dull oval instead. Hollowing the middle
   * makes it a true corona: light only outside the disc it belongs to.
   */
  inner?: number;
  /**
   * How far to push the sprite toward the viewer, in LDraw units.
   *
   * A halo is a flat billboard. Centred exactly on the part it surrounds, the
   * near half of that part pokes through the sprite plane and only the far half
   * receives the additive light — which renders as a crisp two-tone split across
   * the stud rather than a glow. Lifting the sprite clear of the geometry fixes
   * it. Defaults to 20, about one stud.
   */
  lift?: number;
}

/**
 * A soft radial falloff, drawn once and shared by every halo.
 *
 * Two stops do the work: a small bright core and a long tail that reaches zero
 * well inside the sprite, so the glow has no visible edge. The curve is
 * deliberately not linear — light falls off fast near the source and slowly
 * after, and a linear ramp reads as a flat disc.
 */
function haloTexture(inner: number): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a 2D context for the halo texture");

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  /*
   * Banded, not gaussian. Van Gogh draws a corona as concentric rings of
   * pigment, and a smooth falloff reads as lens fog — which is exactly what an
   * earlier version looked like.
   *
   * The stops are laid out across whatever is left after the hollow centre, so
   * the same band structure works for a solid core and for a ring.
   */
  const clamped = Math.min(0.92, Math.max(0, inner));
  const bands: Array<[number, number]> = clamped > 0
    // A ring: nothing in the middle, a bright edge, then two fading bands.
    ? [
        [0, 0],
        [clamped, 0],
        [clamped + (1 - clamped) * 0.06, 0.55],
        [clamped + (1 - clamped) * 0.2, 0.24],
        [clamped + (1 - clamped) * 0.34, 0.3],
        [clamped + (1 - clamped) * 0.52, 0.1],
        [clamped + (1 - clamped) * 0.74, 0.03],
        [1, 0],
      ]
    : [
        [0.0, 1],
        [0.13, 0.86],
        [0.2, 0.3],
        [0.28, 0.46],
        [0.36, 0.14],
        [0.46, 0.22],
        [0.58, 0.06],
        [0.78, 0.02],
        [1.0, 0],
      ];

  for (const [stop, alpha] of bands) {
    gradient.addColorStop(Math.min(1, Math.max(0, stop)), `rgba(255,255,255,${alpha})`);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One texture per distinct hollow fraction; there are only ever a couple. */
const textures = new Map<number, THREE.Texture>();

function textureFor(inner: number): THREE.Texture {
  const key = Math.round(inner * 100) / 100;
  const existing = textures.get(key);
  if (existing) return existing;
  const created = haloTexture(key);
  textures.set(key, created);
  return created;
}

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

  const group = new THREE.Group();
  group.name = "lego-halos";

  for (const spec of specs) {
    const material = new THREE.SpriteMaterial({
      map: textureFor(spec.inner ?? 0),
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
    // +z is toward the viewer for a wall-mounted panel, so the lift clears the
    // part the halo belongs to instead of bisecting it.
    const lift = spec.lift ?? 20;
    sprite.position.set(x, flip ? -y : y, (flip ? -z : z) + lift);
    sprite.scale.setScalar(spec.size);
    // Draw after the bricks: these are light in the air, not surfaces.
    sprite.renderOrder = 10;
    group.add(sprite);
  }

  return group;
}

/** Frees the shared halo textures. */
export function disposeHaloTexture(): void {
  for (const texture of textures.values()) texture.dispose();
  textures.clear();
}
