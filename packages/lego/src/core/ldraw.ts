import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawUtils } from "three/addons/utils/LDrawUtils.js";
import { LDU_TO_STUDS } from "../tokens/dimensions";

export interface LDrawModelOptions {
  /**
   * Scale to a footprint of this many studs on its longest horizontal axis.
   * Omit to keep true LDraw scale (converted to stud units).
   */
  fitToStuds?: number;
  /** Centre on x/z and sit the model on y = 0. Defaults to true. */
  ground?: boolean;
  /**
   * Rebuild the model as instanced draw calls, one per (part, material) pair.
   *
   * LDrawLoader already **shares** a single BufferGeometry between every
   * placement of the same part, carrying the transform on the object instead.
   * Instancing preserves that sharing: geometry is uploaded once and the
   * placements become instance matrices. Defaults to true.
   */
  instanced?: boolean;
  /**
   * Merge the loaded parts into a handful of draw calls.
   *
   * Reduces draw calls the most, but **flattens the loader's shared geometry
   * into real vertices** — measured at 9x the vertex data for 10281 and 30x for
   * 10276 Colosseum. Prefer `instanced`. Defaults to false.
   */
  merge?: boolean;
  /** Cast/receive shadows. Defaults to true. */
  shadows?: boolean;
  /** Draw the black outlines LDraw models carry. Defaults to false. */
  edges?: boolean;
  /** Path prefix for unpacked models that reference external part files. */
  partsPath?: string;
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Rebuilds a loaded LDraw hierarchy as instanced draw calls.
 *
 * Placements of the same part share one BufferGeometry coming out of the
 * loader, so grouping meshes by (geometry, material) and moving their world
 * transforms into an instance matrix keeps the geometry single-copy on the GPU.
 * Merging instead would flatten that sharing back into duplicated vertices.
 *
 * Buckets of one stay ordinary meshes — an InstancedMesh of a single instance
 * only adds overhead.
 */
function toInstanced(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);

  interface Bucket {
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    matrices: THREE.Matrix4[];
  }
  const buckets = new Map<string, Bucket>();
  const lines: THREE.Object3D[] = [];

  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) return;
    if (object instanceof THREE.Mesh) {
      const material = object.material;
      const materialKey = Array.isArray(material)
        ? material.map((entry) => entry.uuid).join("+")
        : material.uuid;
      const key = `${object.geometry.uuid}|${materialKey}`;
      // World-space, so the root's LDraw y-flip is baked into the instances.
      // Taking these relative to the root instead would silently drop it and
      // render the whole model upside down.
      const matrix = object.matrixWorld.clone();
      const bucket = buckets.get(key);
      if (bucket) bucket.matrices.push(matrix);
      else buckets.set(key, { geometry: object.geometry, material, matrices: [matrix] });
    } else if (object instanceof THREE.LineSegments) {
      lines.push(object);
    }
  });

  const out = new THREE.Group();
  out.name = "lego-ldraw-instanced";

  for (const bucket of buckets.values()) {
    if (bucket.matrices.length === 1) {
      const mesh = new THREE.Mesh(bucket.geometry, bucket.material);
      mesh.applyMatrix4(bucket.matrices[0]);
      out.add(mesh);
      continue;
    }
    const mesh = new THREE.InstancedMesh(
      bucket.geometry,
      bucket.material as THREE.Material,
      bucket.matrices.length,
    );
    bucket.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    // Instances are placed in the model's own space, which frustum culling
    // against the shared geometry's bounds would get wrong.
    mesh.frustumCulled = false;
    out.add(mesh);
  }

  // Edges are hidden by default and cheap to keep as-is.
  for (const line of lines) {
    const clone = line.clone();
    clone.applyMatrix4(line.matrixWorld);
    clone.matrixAutoUpdate = false;
    out.add(clone);
  }

  return out;
}

const cache = new Map<string, Promise<THREE.Group>>();

/**
 * Loads an LDraw model (`.ldr`/`.mpd`/`.dat`) and normalises it onto the
 * library's grid: y-up, sitting on the ground plane, measured in stud units so
 * a loaded set drops straight into a scene beside procedural bricks.
 *
 * Self-contained packed `.mpd` files load with no extra requests — see
 * `scripts/import-omr-bonsai.mjs` for how to produce one.
 */
export async function loadLDrawModel(
  url: string,
  options: LDrawModelOptions = {},
): Promise<THREE.Group> {
  const {
    fitToStuds,
    ground = true,
    instanced = true,
    merge = false,
    shadows = true,
    edges = false,
    partsPath,
    onProgress,
    signal,
  } = options;

  const key = `${url}|${instanced}|${merge}|${edges}|${partsPath ?? ""}`;
  let pending = cache.get(key);

  if (!pending) {
    const loader = new LDrawLoader();
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
    if (partsPath) loader.setPartsLibraryPath(partsPath);

    pending = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        url,
        (group) => {
          // LDraw is y-down; flip it to match three.js/our grid.
          group.rotation.x = Math.PI;
          group.updateMatrixWorld(true);
          if (merge) {
            resolve(LDrawUtils.mergeObject(group) as THREE.Group);
          } else if (instanced) {
            resolve(toInstanced(group));
          } else {
            resolve(group);
          }
        },
        (event) => onProgress?.(event.loaded, event.total),
        (error) => reject(error instanceof Error ? error : new Error(String(error))),
      );
    });
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }

  const loaded = await pending;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // Each consumer gets its own transformable copy of the shared parse. Cloning
  // an InstancedMesh shares its geometry and instance buffer, so this stays
  // cheap.
  const model = loaded.clone(true);
  const container = new THREE.Group();
  container.name = "lego-ldraw-model";
  container.add(model);

  if (!edges) {
    model.traverse((object) => {
      if (object instanceof THREE.LineSegments) object.visible = false;
    });
  }

  container.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(container);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const scale = fitToStuds
    ? fitToStuds / Math.max(size.x, size.z, 1e-6)
    : LDU_TO_STUDS;
  container.scale.setScalar(scale);

  if (ground) {
    model.position.set(-center.x, -box.min.y, -center.z);
  }

  if (shadows) {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  container.updateMatrixWorld(true);
  return container;
}

/**
 * Warms the cache for a model without adding it to a scene.
 *
 * Switching the backdrop between sets is instant once the target is parsed, so
 * call this for the next likely set while the current one is on screen.
 * Failures are swallowed: a preload is an optimisation, never a hard error.
 */
export function preloadLDrawModel(url: string, options: LDrawModelOptions = {}): void {
  loadLDrawModel(url, options).catch(() => {});
}

/** Clears the parsed-model cache and frees its GPU resources. */
export function disposeLDrawCache(): void {
  for (const pending of cache.values()) {
    pending
      .then((group) => {
        group.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
            object.geometry.dispose();
            const material = object.material;
            (Array.isArray(material) ? material : [material]).forEach((entry) =>
              entry.dispose(),
            );
          }
        });
      })
      .catch(() => {});
  }
  cache.clear();
}
