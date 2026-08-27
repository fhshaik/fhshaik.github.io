import { DEFAULT_HEIGHT_PLATES } from "../tokens/dimensions";
import type { LegoColorName } from "../tokens/colors";
import type { BrickPlacement, GridPosition } from "./brick";

let counter = 0;
/** Monotonic id for imperatively-created placements. */
export const nextBrickId = (prefix = "brick") => `${prefix}-${(counter += 1)}`;

/**
 * A studded baseplate — the ground an authored set sits on.
 *
 * Note this library deliberately provides *parts*, not compositions: LEGO
 * builds come from official authored sets loaded via {@link loadLDrawModel},
 * never generated here.
 */
export function baseplate(
  width: number,
  depth: number,
  color: LegoColorName | string = "sand-green",
  origin: GridPosition = [0, 0, 0],
): BrickPlacement {
  return {
    id: nextBrickId("baseplate"),
    part: { kind: "baseplate", width, depth },
    color,
    position: origin,
    interactive: false,
  };
}

/** Total grid extent of a set of placements — handy for centring. */
export function boundsOf(placements: readonly BrickPlacement[]): {
  width: number;
  depth: number;
  levels: number;
} {
  if (placements.length === 0) return { width: 0, depth: 0, levels: 0 };
  let maxX = -Infinity;
  let maxZ = -Infinity;
  let maxLevel = -Infinity;
  let minX = Infinity;
  let minZ = Infinity;
  for (const placement of placements) {
    const part = placement.part;
    const [x, level, z] = placement.position;
    minX = Math.min(minX, x);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x + part.width);
    maxZ = Math.max(maxZ, z + part.depth);
    maxLevel = Math.max(
      maxLevel,
      level + (part.heightPlates ?? DEFAULT_HEIGHT_PLATES[part.kind]),
    );
  }
  return { width: maxX - minX, depth: maxZ - minZ, levels: maxLevel };
}
