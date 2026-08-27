import * as THREE from "three";
import { PLATE_HEIGHT } from "../tokens/dimensions";
import { resolvePart, type PartSpec, type ResolvedPart } from "./geometry";
import { materialKey, type ColorInput } from "./materials";

/**
 * Where a brick sits, in grid terms: `[x, level, z]` where x and z are studs
 * and level counts plates up from the ground. A brick placed at level 0 that is
 * three plates tall puts the next brick at level 3.
 */
export type GridPosition = [x: number, level: number, z: number];

export interface BrickPlacement {
  /** Stable id. Auto-assigned by the React layer. */
  id: string;
  part: PartSpec;
  color: ColorInput;
  position: GridPosition;
  /**
   * Rotation about the vertical axis, in degrees. Snapped to the grid at
   * multiples of 90; free angles are allowed for decorative parts.
   */
  rotation?: number;
  /**
   * `"corner"` (default) puts the position at the brick's minimum x/z corner,
   * so a 2x4 at `[0, 0, 0]` covers studs 0–1 by 0–3. `"center"` centres it.
   */
  anchor?: "corner" | "center";
  /** Whether pointer events hit this brick. Defaults to true. */
  interactive?: boolean;
  /** Arbitrary payload handed back on pick/hover. */
  data?: unknown;
  /** Hidden without removing it from the scene graph. Also stops picking. */
  visible?: boolean;
  /**
   * Rendered fully transparent but still hit-testable — an invisible pick
   * volume over a region of a larger model.
   */
  ghost?: boolean;
}

export interface ResolvedBrick extends BrickPlacement {
  resolvedPart: ResolvedPart;
  /** Batch key — geometry and material identity combined. */
  batchKey: string;
  matrix: THREE.Matrix4;
}

const scratchQuaternion = new THREE.Quaternion();
const scratchEuler = new THREE.Euler();
const scratchPosition = new THREE.Vector3();
const scratchScale = new THREE.Vector3(1, 1, 1);

/**
 * World transform for a placement. Geometry is authored centred on its
 * footprint, so a corner anchor shifts by half the (rotated) footprint.
 */
export function placementMatrix(
  placement: BrickPlacement,
  part: ResolvedPart,
  target = new THREE.Matrix4(),
): THREE.Matrix4 {
  const [x, level, z] = placement.position;
  const rotation = ((placement.rotation ?? 0) * Math.PI) / 180;
  const anchor = placement.anchor ?? "corner";

  let offsetX = 0;
  let offsetZ = 0;
  if (anchor === "corner") {
    // Half-footprint offset, rotated with the brick so the anchored corner
    // stays put at 90/180/270 degrees.
    const halfW = part.width / 2;
    const halfD = part.depth / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    offsetX = halfW * Math.abs(cos) + halfD * Math.abs(sin);
    offsetZ = halfW * Math.abs(sin) + halfD * Math.abs(cos);
  }

  scratchPosition.set(x + offsetX, level * PLATE_HEIGHT, z + offsetZ);
  scratchEuler.set(0, rotation, 0);
  scratchQuaternion.setFromEuler(scratchEuler);
  return target.compose(scratchPosition, scratchQuaternion, scratchScale);
}

export function resolveBrick(placement: BrickPlacement): ResolvedBrick {
  const resolvedPart = resolvePart(placement.part);
  return {
    ...placement,
    resolvedPart,
    batchKey: placement.ghost
      ? `${resolvedPart.key}|__ghost`
      : `${resolvedPart.key}|${materialKey(placement.color)}`,
    matrix: placementMatrix(placement, resolvedPart),
  };
}

/** Footprint a placement occupies, in grid units — handy for collision checks. */
export function brickFootprint(placement: BrickPlacement): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minLevel: number;
  maxLevel: number;
} {
  const part = resolvePart(placement.part);
  const quarter = Math.round(((placement.rotation ?? 0) % 360) / 90) % 2;
  const width = quarter === 0 ? part.width : part.depth;
  const depth = quarter === 0 ? part.depth : part.width;
  const [x, level, z] = placement.position;
  const originX = placement.anchor === "center" ? x - width / 2 : x;
  const originZ = placement.anchor === "center" ? z - depth / 2 : z;
  return {
    minX: originX,
    maxX: originX + width,
    minZ: originZ,
    maxZ: originZ + depth,
    minLevel: level,
    maxLevel: level + part.heightPlates,
  };
}

/** True when two placements overlap in all three axes. */
export function bricksCollide(a: BrickPlacement, b: BrickPlacement): boolean {
  const one = brickFootprint(a);
  const two = brickFootprint(b);
  return (
    one.minX < two.maxX &&
    two.minX < one.maxX &&
    one.minZ < two.maxZ &&
    two.minZ < one.maxZ &&
    one.minLevel < two.maxLevel &&
    two.minLevel < one.maxLevel
  );
}
