import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/**
 * Animated swirl distortion.
 *
 * Rotates the sampled image around a few centres, with the twist falling off to
 * nothing at the edge of each region and oscillating slowly over time. The result is that
 * part of the picture appears to churn without a single brick moving — which is
 * the only honest way to animate an authored build: nothing is rearranged, the
 * *image* flows.
 *
 * The centres are screen-space, so the stage reprojects them from world
 * positions every frame; otherwise they would slide off the subject the moment
 * the camera moved. Radius is screen-space too, derived by projecting a point
 * one radius away, so a swirl keeps its size on the canvas as the view zooms.
 *
 * **Tried on 21333 and rejected: it is nauseating.** Warping a picture that the
 * eye expects to hold still reads as motion sickness rather than as life, and no
 * amount of softening the amplitude fixed the underlying problem. It also
 * rubber-sheets everything in the region — straight tile edges bend and studs
 * wobble. Left here because the machinery (world-space centres reprojected each
 * frame) may suit a genuinely fluid subject, but do not reach for it on a
 * painting.
 */
export const VortexShader = {
  name: "LegoVortexShader",

  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    aspect: { value: 1 },
    // xy = centre in UV, z = radius in UV, w = unused
    centreA: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
    centreB: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
    centreC: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
    // x = static twist, y = oscillation amplitude, z = oscillations/sec
    paramsA: { value: new THREE.Vector3(0, 0, 0) },
    paramsB: { value: new THREE.Vector3(0, 0, 0) },
    paramsC: { value: new THREE.Vector3(0, 0, 0) },
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
    uniform float time;
    uniform float aspect;
    uniform vec4 centreA;
    uniform vec4 centreB;
    uniform vec4 centreC;
    uniform vec3 paramsA;
    uniform vec3 paramsB;
    uniform vec3 paramsC;
    varying vec2 vUv;

    /*
     * One swirl. Returns the coordinate to sample instead of uv.
     *
     * The falloff is squared so the twist dies smoothly at the rim: a linear
     * falloff leaves a visible circular crease where the rotation stops.
     */
    vec2 swirl(vec2 uv, vec4 centre, vec3 params) {
      float radius = centre.z;
      if (radius <= 0.0) return uv;

      // Undo the aspect ratio so the region is a circle on screen, not an
      // ellipse in UV space.
      vec2 delta = (uv - centre.xy) * vec2(aspect, 1.0);
      float distance = length(delta);
      if (distance > radius) return uv;

      float falloff = 1.0 - smoothstep(0.0, radius, distance);
      /*
       * The twist *oscillates*. An earlier version advanced it with time, which
       * accumulates without bound — the sky wound tighter every second until it
       * was unrecognisable. A sine returns, so the region churns and settles
       * forever without ever winding up.
       */
      float angle = (params.x + sin(time * params.z * 6.2831853) * params.y)
                    * falloff * falloff;

      float s = sin(angle);
      float c = cos(angle);
      vec2 rotated = vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
      return centre.xy + rotated / vec2(aspect, 1.0);
    }

    void main() {
      vec2 uv = vUv;
      // Applied in sequence, so overlapping swirls compose.
      uv = swirl(uv, centreA, paramsA);
      uv = swirl(uv, centreB, paramsB);
      uv = swirl(uv, centreC, paramsC);
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};

export interface VortexSpec {
  /** Centre in world space. Reprojected every frame. */
  position: THREE.Vector3;
  /** Radius in world units. */
  radius: number;
  /** Fixed twist, in radians at the centre. */
  twist?: number;
  /** How far the twist swings either side of `twist`, in radians. */
  flow?: number;
  /** Oscillations per second. 0.05 is a very slow churn. */
  speed?: number;
}

export function createVortexPass(): ShaderPass {
  return new ShaderPass(VortexShader);
}
