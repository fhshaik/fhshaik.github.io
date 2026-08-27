import * as THREE from "three";
import { partGeometry } from "./geometry";
import { partMaterial } from "./materials";
import type { LegoStage } from "./stage";
import type { LegoColorName } from "../tokens/colors";

export interface PetalFieldOptions {
  /** Total petals. Split evenly across `colors`. */
  count?: number;
  /** Colours to draw from. Defaults to the 10281 blossom palette. */
  colors?: readonly (LegoColorName | string)[];
  /** Horizontal spread, in studs. */
  area?: number;
  /** Height of the column petals fall through, in studs. */
  height?: number;
  /** Studs per second of fall. */
  speed?: number;
  /** Horizontal sway amplitude, in studs. */
  sway?: number;
  /** Scale applied to the 1x1 tile. 1 is true size. */
  size?: number;
  /**
   * Vertical squash. A round tile is a short cylinder; flattening it reads as a
   * petal rather than a pill when it tumbles. Defaults to 0.45.
   */
  flatten?: number;
  /** Seed, so the same field replays identically. */
  seed?: number;
}

interface Batch {
  mesh: THREE.InstancedMesh;
  /** Per-instance state, flat for cache friendliness. */
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  phase: Float32Array;
  swaySpeed: Float32Array;
  fall: Float32Array;
  spinX: Float32Array;
  spinY: Float32Array;
  spinZ: Float32Array;
  angleX: Float32Array;
  angleY: Float32Array;
  angleZ: Float32Array;
}

/** The blossom colours 10281 actually uses. */
const DEFAULT_COLORS: readonly LegoColorName[] = ["bright-pink", "white", "dark-pink"];

/**
 * Falling petals, as real LEGO parts.
 *
 * Each petal is a 1x1 round tile — the part LEGO uses for the blossoms in
 * 10281 — generated to true LDraw dimensions, so the particles are made of the
 * same bricks as everything else rather than being sprites.
 *
 * One InstancedMesh per colour, so a few hundred petals cost a handful of draw
 * calls. Motion is a fall plus a lateral sway and a slow tumble; petals wrap
 * back to the top, so the field runs forever without allocating.
 */
export class PetalField {
  private readonly batches: Batch[] = [];
  private readonly options: Required<PetalFieldOptions>;
  private readonly group = new THREE.Group();
  private stop?: () => void;

  constructor(
    private readonly stage: LegoStage,
    options: PetalFieldOptions = {},
  ) {
    this.options = {
      count: options.count ?? 160,
      colors: options.colors ?? DEFAULT_COLORS,
      area: options.area ?? 26,
      height: options.height ?? 18,
      speed: options.speed ?? 1.15,
      sway: options.sway ?? 1.4,
      size: options.size ?? 1,
      flatten: options.flatten ?? 0.45,
      seed: options.seed ?? 7,
    };

    this.group.name = "lego-petals";
    this.build();
    this.stage.addObject(this.group);
    this.stop = this.stage.addUpdater((delta) => this.update(delta));
  }

  private build(): void {
    const { count, colors, area, height, speed, size, flatten, seed } = this.options;
    // A 1x1 round tile: plate height, no stud. The blossom part.
    const geometry = partGeometry({
      kind: "round",
      width: 1,
      depth: 1,
      heightPlates: 1,
      studs: false,
    });

    const perColor = Math.max(1, Math.floor(count / colors.length));
    let cursor = seed >>> 0;
    // Inlined xorshift: a petal field is pure decoration, and keeping the RNG
    // local avoids a dependency for something this small.
    const random = () => {
      cursor ^= cursor << 13;
      cursor ^= cursor >>> 17;
      cursor ^= cursor << 5;
      return ((cursor >>> 0) % 100000) / 100000;
    };

    for (const color of colors) {
      const material = partMaterial(color);
      const mesh = new THREE.InstancedMesh(geometry, material, perColor);
      mesh.frustumCulled = false;
      // Petals should not darken the build below them.
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const batch: Batch = {
        mesh,
        x: new Float32Array(perColor),
        y: new Float32Array(perColor),
        z: new Float32Array(perColor),
        phase: new Float32Array(perColor),
        swaySpeed: new Float32Array(perColor),
        fall: new Float32Array(perColor),
        spinX: new Float32Array(perColor),
        spinY: new Float32Array(perColor),
        spinZ: new Float32Array(perColor),
        angleX: new Float32Array(perColor),
        angleY: new Float32Array(perColor),
        angleZ: new Float32Array(perColor),
      };

      for (let index = 0; index < perColor; index += 1) {
        batch.x[index] = (random() - 0.5) * area;
        batch.z[index] = (random() - 0.5) * area;
        batch.y[index] = random() * height;
        batch.phase[index] = random() * Math.PI * 2;
        batch.swaySpeed[index] = 0.4 + random() * 0.8;
        batch.fall[index] = speed * (0.55 + random() * 0.9);
        batch.spinX[index] = (random() - 0.5) * 1.6;
        batch.spinY[index] = (random() - 0.5) * 2.2;
        batch.spinZ[index] = (random() - 0.5) * 1.6;
        batch.angleX[index] = random() * Math.PI * 2;
        batch.angleY[index] = random() * Math.PI * 2;
        batch.angleZ[index] = random() * Math.PI * 2;
      }

      mesh.scale.set(size, size * flatten, size);
      this.group.add(mesh);
      this.batches.push(batch);
    }
  }

  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private elapsed = 0;

  private update(delta: number): void {
    // Clamp: a backgrounded tab returns a huge delta, which would teleport
    // every petal at once.
    const step = Math.min(delta, 1 / 20);
    this.elapsed += step;
    const { height, sway, area } = this.options;

    for (const batch of this.batches) {
      const total = batch.mesh.count;
      for (let index = 0; index < total; index += 1) {
        batch.y[index] -= batch.fall[index] * step;
        if (batch.y[index] < 0) {
          // Wrap to the top and re-place horizontally, so the field never
          // thins out or repeats a visible column.
          batch.y[index] += height;
          batch.x[index] = (batch.x[index] + area * 0.37) % area - area / 2;
        }

        batch.angleX[index] += batch.spinX[index] * step;
        batch.angleY[index] += batch.spinY[index] * step;
        batch.angleZ[index] += batch.spinZ[index] * step;

        const drift =
          Math.sin(this.elapsed * batch.swaySpeed[index] + batch.phase[index]) * sway;
        const driftZ =
          Math.cos(this.elapsed * batch.swaySpeed[index] * 0.7 + batch.phase[index]) *
          sway *
          0.6;

        this.position.set(batch.x[index] + drift, batch.y[index], batch.z[index] + driftZ);
        this.euler.set(batch.angleX[index], batch.angleY[index], batch.angleZ[index]);
        this.quaternion.setFromEuler(this.euler);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        batch.mesh.setMatrixAt(index, this.matrix);
      }
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Removes the field and stops its per-frame work. */
  dispose(): void {
    this.stop?.();
    this.stop = undefined;
    this.stage.removeObject(this.group);
    for (const batch of this.batches) batch.mesh.dispose();
    this.batches.length = 0;
  }
}
