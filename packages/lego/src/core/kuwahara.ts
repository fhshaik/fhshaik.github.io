import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/**
 * Kuwahara filter — the classic "make it an oil painting" operator.
 *
 * For each pixel it looks at four overlapping quadrants of the surrounding
 * window, measures the colour variance in each, and outputs the mean of
 * whichever quadrant is flattest. The effect is that flat areas get flatter
 * while edges stay put, which is exactly what a loaded brush does: it smears
 * within a region of colour but stops at a boundary.
 *
 * The radius is in **framebuffer pixels**, which matters more than it sounds: a
 * radius of 3 on a 2880-wide render is a tenth of one percent of the image and
 * is simply invisible. Strokes need to be several *CSS* pixels across to read as
 * brushwork, so the stage pins the pixel ratio to 1 whenever this is enabled —
 * which makes the effect visible and cuts the cost at the same time.
 *
 * Cost is the catch. A radius of 4 is 4 x 25 = 100 texture fetches per pixel and
 * scales with the square of the radius, so the radius is a compile-time constant
 * baked into the shader rather than a uniform: it keeps the loops const-bounded
 * for GLSL ES 1.0, and stops anyone raising a quadratic cost at runtime.
 */

export interface KuwaharaOptions {
  /**
   * Window radius in framebuffer pixels. 3 is a hint, 5 reads clearly as
   * brushwork, 7 is heavy smearing. Default 5.
   */
  radius?: number;
  /** Blend against the original, 0–1. Below 1 keeps some brick detail. */
  strength?: number;
}

function shader(radius: number) {
  return {
    name: "LegoKuwaharaShader",

    defines: {
      KUWAHARA_RADIUS: radius,
    },

    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      resolution: { value: new THREE.Vector2(1, 1) },
      strength: { value: 0.85 },
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
      uniform vec2 resolution;
      uniform float strength;
      varying vec2 vUv;

      /*
       * One quadrant. sx and sy are +1 or -1, which is how the same loop covers
       * all four without four copies of the body.
       */
      void quadrant(vec2 uv, vec2 texel, float sx, float sy, out vec3 mean, out float spread) {
        vec3 sum = vec3(0.0);
        vec3 sumSquares = vec3(0.0);
        float count = 0.0;

        for (int i = 0; i <= KUWAHARA_RADIUS; i++) {
          for (int j = 0; j <= KUWAHARA_RADIUS; j++) {
            vec2 offset = vec2(float(i) * sx, float(j) * sy) * texel;
            vec3 texelColor = texture2D(tDiffuse, uv + offset).rgb;
            sum += texelColor;
            sumSquares += texelColor * texelColor;
            count += 1.0;
          }
        }

        mean = sum / count;
        // Variance per channel, summed: a single number for "how mixed is this
        // quadrant".
        vec3 variance = sumSquares / count - mean * mean;
        spread = variance.r + variance.g + variance.b;
      }

      void main() {
        vec2 texel = 1.0 / resolution;

        vec3 meanA; float spreadA;
        vec3 meanB; float spreadB;
        vec3 meanC; float spreadC;
        vec3 meanD; float spreadD;

        quadrant(vUv, texel, -1.0, -1.0, meanA, spreadA);
        quadrant(vUv, texel,  1.0, -1.0, meanB, spreadB);
        quadrant(vUv, texel, -1.0,  1.0, meanC, spreadC);
        quadrant(vUv, texel,  1.0,  1.0, meanD, spreadD);

        // Keep the flattest quadrant: that is the one least likely to be
        // straddling an edge.
        vec3 result = meanA;
        float lowest = spreadA;
        if (spreadB < lowest) { lowest = spreadB; result = meanB; }
        if (spreadC < lowest) { lowest = spreadC; result = meanC; }
        if (spreadD < lowest) { lowest = spreadD; result = meanD; }

        vec4 original = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(mix(original.rgb, result, strength), original.a);
      }
    `,
  };
}

/** Builds the pass. Radius is fixed at construction; rebuild to change it. */
export function createKuwaharaPass(options: KuwaharaOptions = {}): ShaderPass {
  const radius = Math.max(1, Math.min(8, Math.round(options.radius ?? 5)));
  const pass = new ShaderPass(shader(radius));
  pass.uniforms.strength.value = options.strength ?? 0.85;
  return pass;
}
