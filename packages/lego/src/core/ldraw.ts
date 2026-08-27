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
   * Merge the loaded parts into a handful of draw calls. Large official models
   * are hundreds of separate meshes; merging is a big win. Defaults to true.
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
    merge = true,
    shadows = true,
    edges = false,
    partsPath,
    onProgress,
    signal,
  } = options;

  const key = `${url}|${merge}|${edges}|${partsPath ?? ""}`;
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
          resolve(merge ? (LDrawUtils.mergeObject(group) as THREE.Group) : group);
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

  // Each consumer gets its own transformable copy of the shared parse.
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
