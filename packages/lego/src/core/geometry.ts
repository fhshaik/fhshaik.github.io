import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BASEPLATE_HEIGHT,
  DEFAULT_HEIGHT_PLATES,
  EDGE_BEVEL,
  PART_CLEARANCE,
  PLATE_HEIGHT,
  SLOPE_RUN,
  STUD_HEIGHT,
  STUD_RADIUS,
} from "../tokens/dimensions";

export type PartKind = keyof typeof DEFAULT_HEIGHT_PLATES;

export interface PartSpec {
  kind: PartKind;
  /** Footprint along x, in studs. */
  width: number;
  /** Footprint along z, in studs. */
  depth: number;
  /**
   * Height in plates. Defaults per kind (brick 3, plate/tile 1, baseplate ½).
   * A `brick` with `heightPlates: 6` is a double-height brick.
   */
  heightPlates?: number;
  /** Studs on top. Defaults to false for `tile`, true otherwise. */
  studs?: boolean;
}

/** Fully defaulted {@link PartSpec}. */
export interface ResolvedPart extends Required<PartSpec> {
  /** Height in stud units. */
  height: number;
  /** Stable cache key — also the instancing batch key. */
  key: string;
}

export function resolvePart(spec: PartSpec): ResolvedPart {
  const heightPlates = spec.heightPlates ?? DEFAULT_HEIGHT_PLATES[spec.kind];
  const studs = spec.studs ?? spec.kind !== "tile";
  const width = Math.max(1, spec.width);
  const depth = Math.max(1, spec.depth);
  const height =
    spec.kind === "baseplate" ? BASEPLATE_HEIGHT : heightPlates * PLATE_HEIGHT;
  return {
    kind: spec.kind,
    width,
    depth,
    heightPlates,
    studs,
    height,
    key: `${spec.kind}:${width}x${depth}x${heightPlates}${studs ? "+s" : ""}`,
  };
}

/** Fewer segments on huge stud fields (a 48x48 baseplate is 2304 studs). */
function studSegments(count: number): number {
  if (count > 900) return 8;
  if (count > 200) return 12;
  return 20;
}

function studGeometry(segments: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    STUD_RADIUS,
    STUD_RADIUS,
    STUD_HEIGHT,
    segments,
    1,
    false,
  );
  geometry.translate(0, STUD_HEIGHT / 2, 0);
  return geometry;
}

/**
 * Top-surface stud positions for a footprint, centred on the origin.
 * `inset` trims the grid — a slope only has studs on its flat portion.
 */
function studPositions(
  width: number,
  depth: number,
  insetX = 0,
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  const columns = width - insetX;
  for (let x = 0; x < columns; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      positions.push([x + 0.5 - width / 2, z + 0.5 - depth / 2]);
    }
  }
  return positions;
}

/**
 * Makes a geometry safe to merge with any other.
 *
 * `mergeGeometries` requires every input to agree on index state and attribute
 * set, and three's builders do not: `RoundedBoxGeometry` is non-indexed with
 * six material groups, `CylinderGeometry` is indexed with three, and
 * `ExtrudeGeometry` orders its attributes differently. Normalising to
 * non-indexed, group-free position/normal/uv makes them interchangeable.
 */
function normalizeForMerge(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  let flat = geometry;
  if (geometry.index) {
    flat = geometry.toNonIndexed();
    geometry.dispose();
  }
  flat.clearGroups();
  for (const name of Object.keys(flat.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") {
      flat.deleteAttribute(name);
    }
  }
  return flat;
}

function withStuds(
  body: THREE.BufferGeometry,
  positions: Array<[number, number]>,
  topY: number,
): THREE.BufferGeometry {
  const normalizedBody = normalizeForMerge(body);
  if (positions.length === 0) return normalizedBody;

  const stud = normalizeForMerge(studGeometry(studSegments(positions.length)));
  const parts: THREE.BufferGeometry[] = [normalizedBody];
  for (const [x, z] of positions) {
    const placed = stud.clone();
    placed.translate(x, topY, z);
    parts.push(placed);
  }

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  stud.dispose();

  if (!merged) {
    throw new Error(
      "Failed to merge stud geometry — inputs disagreed on attributes or index state",
    );
  }
  return merged;
}

function boxBody(
  width: number,
  depth: number,
  height: number,
): THREE.BufferGeometry {
  const w = width - PART_CLEARANCE * 2;
  const d = depth - PART_CLEARANCE * 2;
  // RoundedBoxGeometry requires radius < half the smallest dimension.
  const radius = Math.min(EDGE_BEVEL, Math.min(w, d, height) / 2.05);
  const geometry = new RoundedBoxGeometry(w, height, d, 2, radius);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function slopeBody(
  width: number,
  depth: number,
  height: number,
): THREE.BufferGeometry {
  const w = width - PART_CLEARANCE * 2;
  const d = depth - PART_CLEARANCE * 2;
  const run = Math.min(SLOPE_RUN, w * 0.75);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w - run, height);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: false,
    steps: 1,
  });
  // Extrusion runs along +z from the xy profile; recentre on the footprint.
  geometry.translate(-w / 2, 0, -d / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function roundBody(
  width: number,
  height: number,
  topScale: number,
): THREE.BufferGeometry {
  const radius = width / 2 - PART_CLEARANCE;
  const geometry = new THREE.CylinderGeometry(
    radius * topScale,
    radius,
    height,
    Math.max(16, Math.round(width * 24)),
    1,
    false,
  );
  geometry.translate(0, height / 2, 0);
  return geometry;
}

const CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Geometry for a part, in stud units: centred on its footprint in x/z with its
 * base at y = 0. Results are cached and shared — never mutate or dispose the
 * returned geometry directly; use {@link disposeGeometryCache}.
 */
export function partGeometry(spec: PartSpec | ResolvedPart): THREE.BufferGeometry {
  const part = "key" in spec ? spec : resolvePart(spec);
  const cached = CACHE.get(part.key);
  if (cached) return cached;

  const { width, depth, height, studs, kind } = part;
  let geometry: THREE.BufferGeometry;

  switch (kind) {
    case "slope": {
      const body = slopeBody(width, depth, height);
      const flat = Math.max(0, width - SLOPE_RUN);
      geometry = withStuds(
        body,
        studs && flat >= 1 ? studPositions(width, depth, SLOPE_RUN) : [],
        height,
      );
      break;
    }
    case "round":
    case "cone": {
      const body = roundBody(width, height, kind === "cone" ? 0.62 : 1);
      geometry = withStuds(body, studs ? [[0, 0]] : [], height);
      break;
    }
    default: {
      const body = boxBody(width, depth, height);
      geometry = withStuds(body, studs ? studPositions(width, depth) : [], height);
    }
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  CACHE.set(part.key, geometry);
  return geometry;
}

/** Frees every cached geometry. Call on teardown in long-lived apps. */
export function disposeGeometryCache(): void {
  for (const geometry of CACHE.values()) geometry.dispose();
  CACHE.clear();
}

/** Number of geometries currently cached — useful in tests. */
export function geometryCacheSize(): number {
  return CACHE.size;
}
