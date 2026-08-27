import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  bricksCollide,
  brickFootprint,
  placementMatrix,
  resolveBrick,
  type BrickPlacement,
} from "../packages/lego/src/core/brick";
import { resolvePart } from "../packages/lego/src/core/geometry";
import { PLATE_HEIGHT } from "../packages/lego/src/tokens/dimensions";

const brick = (overrides: Partial<BrickPlacement> = {}): BrickPlacement => ({
  id: "test",
  part: { kind: "brick", width: 2, depth: 4 },
  color: "red",
  position: [0, 0, 0],
  ...overrides,
});

function translation(placement: BrickPlacement): THREE.Vector3 {
  const part = resolvePart(placement.part);
  const matrix = placementMatrix(placement, part);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}

describe("placementMatrix", () => {
  it("anchors on the minimum corner by default", () => {
    // Geometry is centred, so a corner anchor shifts by half the footprint.
    const position = translation(brick());
    expect(position.x).toBeCloseTo(1);
    expect(position.z).toBeCloseTo(2);
  });

  it("centres on the given point when asked", () => {
    const position = translation(brick({ anchor: "center" }));
    expect(position.x).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(0);
  });

  it("converts levels to plate heights", () => {
    expect(translation(brick({ position: [0, 3, 0] })).y).toBeCloseTo(3 * PLATE_HEIGHT);
    expect(translation(brick({ position: [0, 0, 0] })).y).toBeCloseTo(0);
  });

  it("keeps the anchored corner put when rotated a quarter turn", () => {
    // A 2x4 rotated 90 degrees covers 4 studs in x and 2 in z.
    const position = translation(brick({ rotation: 90 }));
    expect(position.x).toBeCloseTo(2);
    expect(position.z).toBeCloseTo(1);
  });

  it("keeps rotation on the vertical axis only", () => {
    const matrix = placementMatrix(brick({ rotation: 90 }), resolvePart(brick().part));
    const euler = new THREE.Euler().setFromRotationMatrix(matrix);
    expect(euler.x).toBeCloseTo(0);
    expect(euler.z).toBeCloseTo(0);
    expect(euler.y).toBeCloseTo(Math.PI / 2);
  });
});

describe("resolveBrick", () => {
  it("batches identical part+colour together and splits on either change", () => {
    const base = resolveBrick(brick());
    expect(resolveBrick(brick({ id: "other", position: [8, 0, 8] })).batchKey).toBe(base.batchKey);
    expect(resolveBrick(brick({ id: "b", color: "blue" })).batchKey).not.toBe(base.batchKey);
    expect(
      resolveBrick(brick({ id: "c", part: { kind: "plate", width: 2, depth: 4 } })).batchKey,
    ).not.toBe(base.batchKey);
  });

  it("routes ghost bricks to their own batch so they stay invisible", () => {
    expect(resolveBrick(brick({ ghost: true })).batchKey).toContain("__ghost");
  });
});

describe("footprints", () => {
  it("reports the grid cells a brick occupies", () => {
    expect(brickFootprint(brick())).toMatchObject({
      minX: 0,
      maxX: 2,
      minZ: 0,
      maxZ: 4,
      minLevel: 0,
      maxLevel: 3,
    });
  });

  it("swaps width and depth on a quarter turn", () => {
    expect(brickFootprint(brick({ rotation: 90 }))).toMatchObject({ maxX: 4, maxZ: 2 });
    expect(brickFootprint(brick({ rotation: 180 }))).toMatchObject({ maxX: 2, maxZ: 4 });
  });

  it("detects overlap and clears bricks that only share a plane", () => {
    expect(bricksCollide(brick(), brick({ id: "b" }))).toBe(true);
    // Stacked directly on top — touching, not overlapping.
    expect(bricksCollide(brick(), brick({ id: "b", position: [0, 3, 0] }))).toBe(false);
    // Side by side.
    expect(bricksCollide(brick(), brick({ id: "b", position: [2, 0, 0] }))).toBe(false);
    // Same column, one plate up — genuinely intersecting.
    expect(bricksCollide(brick(), brick({ id: "b", position: [0, 1, 0] }))).toBe(true);
  });
});
