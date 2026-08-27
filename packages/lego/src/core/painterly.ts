import * as THREE from "three";

/**
 * Flat, graphic shading — the opposite of the photoreal treatment.
 *
 * A painting has no specular highlights, no cast shadows and no soft
 * physically-based falloff; it has flat areas of saturated pigment with
 * direction supplied by brushwork. Physically-based materials fight that: they
 * add sheen and gradient shading that read as "photograph of a plastic object",
 * washing the colour toward white in the process.
 *
 * Toon shading with a handful of steps is much closer. The brick's own colour
 * survives, the relief still reads through the banding, and the result is
 * graphic rather than photographic.
 */

let gradient: THREE.DataTexture | undefined;

/**
 * A stepped ramp for {@link THREE.MeshToonMaterial}.
 *
 * `steps` is how many tones the surface is quantised to. Three is poster-like;
 * five keeps more of the relief. The ramp is biased bright, so most of a
 * surface sits at full colour and only the turned-away faces darken.
 */
function gradientMap(steps = 4): THREE.DataTexture {
  if (gradient) return gradient;

  const data = new Uint8Array(steps * 4);
  for (let index = 0; index < steps; index += 1) {
    /*
     * A wide ramp puts a hard terminator across curved parts: a 1x1 round stud
     * ends up half bright and half dark, which reads as a two-tone dome rather
     * than as shading. Keeping the range narrow and near the light end means the
     * bands are barely separated — enough to model a flat face, not enough to
     * cut a circle in half.
     */
    const tone = 0.78 + 0.22 * (index / Math.max(steps - 1, 1));
    const value = Math.round(Math.min(1, tone) * 255);
    data.set([value, value, value, 255], index * 4);
  }

  gradient = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

export interface PainterlyOptions {
  /** Tones the surface is quantised to. Fewer is more graphic. */
  steps?: number;
  /**
   * Pushes every colour toward full saturation, 0–1. The LDraw palette is
   * already accurate; this is about matching pigment, which is more intense
   * than moulded plastic.
   */
  saturate?: number;
}

/**
 * Replaces a scene's materials with flat toon shading.
 *
 * Emissive materials are left alone — they are the light sources, and toon
 * shading would flatten them out of existence.
 */
export function applyPainterly(
  scene: THREE.Object3D,
  options: PainterlyOptions = {},
): void {
  const steps = options.steps ?? 5;
  const saturate = options.saturate ?? 0.28;
  const map = gradientMap(steps);
  const converted = new Map<THREE.Material, THREE.Material>();

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const next = materials.map((material) => {
      if (material instanceof THREE.MeshToonMaterial) return material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return material;
      // Leave the lights alone.
      if (material.emissiveIntensity > 0 && material.emissive.getHex() !== 0x000000) {
        return material;
      }

      const existing = converted.get(material);
      if (existing) return existing;

      const color = material.color.clone();
      if (saturate > 0) {
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        color.setHSL(hsl.h, Math.min(1, hsl.s * (1 + saturate)), hsl.l);
      }

      const toon = new THREE.MeshToonMaterial({
        color,
        gradientMap: map,
        transparent: material.transparent,
        opacity: material.opacity,
        side: material.side,
      });
      toon.name = material.name;
      converted.set(material, toon);
      return toon;
    });

    if (next.some((material, index) => material !== materials[index])) {
      mesh.material = Array.isArray(mesh.material) ? next : next[0];
    }
  });
}

/** Frees the shared gradient ramp. */
export function disposePainterly(): void {
  gradient?.dispose();
  gradient = undefined;
}
