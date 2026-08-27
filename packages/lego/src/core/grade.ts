import * as THREE from "three";

/**
 * Colour grade.
 *
 * A lit 3D scene reads as a photograph even when the geometry is graphic; a
 * grade is what turns a set of rendered objects into a single image. This one is
 * built for a painting: saturation and contrast to bring pigment back to full
 * strength, split-toning to push shadows toward ultramarine and highlights
 * toward chrome yellow — the colour relationship the painting is built on — and
 * a vignette to close the frame.
 */
export const GradeShader = {
  name: "LegoGradeShader",

  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    saturation: { value: 1.35 },
    contrast: { value: 1.12 },
    lift: { value: 0.0 },
    shadowTint: { value: new THREE.Color("#12266b") },
    highlightTint: { value: new THREE.Color("#ffd85e") },
    toning: { value: 0.22 },
    vignette: { value: 0.35 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float lift;
    uniform vec3 shadowTint;
    uniform vec3 highlightTint;
    uniform float toning;
    uniform float vignette;
    varying vec2 vUv;

    // Rec. 709 luma: matches how the eye weights the channels, so saturation
    // changes do not shift apparent brightness.
    float luma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // Saturation, around the pixel's own luminance.
      float l = luma(color);
      color = mix(vec3(l), color, saturation);

      // Contrast about mid grey, then lift the floor so shadows stay coloured
      // rather than crushing to black.
      color = (color - 0.5) * contrast + 0.5 + lift;

      // Split-tone: the darks toward blue, the lights toward warm yellow. This
      // is the single strongest cue that an image belongs to this palette.
      float weight = clamp(luma(color), 0.0, 1.0);
      vec3 tint = mix(shadowTint, highlightTint, weight);
      color = mix(color, color * tint * 2.0, toning);

      // Vignette, measured from the centre in aspect-independent UV space.
      vec2 offset = vUv - 0.5;
      float radius = length(offset) * 1.414;
      color *= 1.0 - vignette * smoothstep(0.35, 1.0, radius);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `,
};

export interface GradeOptions {
  saturation?: number;
  contrast?: number;
  lift?: number;
  /** Strength of the shadow/highlight tinting, 0–1. */
  toning?: number;
  /** Corner darkening, 0–1. */
  vignette?: number;
  shadowTint?: string;
  highlightTint?: string;
}
