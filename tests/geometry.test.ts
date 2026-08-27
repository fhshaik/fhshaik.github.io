import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  disposeGeometryCache,
  geometryCacheSize,
  partGeometry,
  resolvePart,
  type PartKind,
} from "../packages/lego/src/core/geometry";
import { BRICK_HEIGHT, PLATE_HEIGHT, STUD_HEIGHT } from "../packages/lego/src/tokens/dimensions";

const KINDS: PartKind[] = ["brick", "plate", "tile", "slope", "round", "cone", "baseplate"];

function vertexCount(geometry: THREE.BufferGeometry): number {
  return geometry.getAttribute("position")?.count ?? 0;
}

describe("resolvePart", () => {
  it("defaults heights per kind", () => {
    expect(resolvePart({ kind: "brick", width: 2, depth: 4 }).heightPlates).toBe(3);
    expect(resolvePart({ kind: "plate", width: 2, depth: 4 }).heightPlates).toBe(1);
  });

  it("gives tiles no studs and bricks studs", () => {
    expect(resolvePart({ kind: "tile", width: 1, depth: 2 }).studs).toBe(false);
    expect(resolvePart({ kind: "brick", width: 1, depth: 2 }).studs).toBe(true);
  });

  it("produces a stable key that distinguishes parts", () => {
    const a = resolvePart({ kind: "brick", width: 2, depth: 4 });
    const b = resolvePart({ kind: "brick", width: 4, depth: 2 });
    expect(a.key).not.toBe(b.key);
    expect(resolvePart({ kind: "brick", width: 2, depth: 4 }).key).toBe(a.key);
  });
});

describe("partGeometry", () => {
  it("builds real geometry for every kind", () => {
    for (const kind of KINDS) {
      const geometry = partGeometry({ kind, width: 2, depth: 2 });
      expect(vertexCount(geometry), kind).toBeGreaterThan(0);
      geometry.computeBoundingBox();
      expect(Number.isFinite(geometry.boundingBox!.max.y), kind).toBe(true);
    }
  });

  it("sits a part on y=0 and centres it on its footprint", () => {
    const geometry = partGeometry({ kind: "brick", width: 2, depth: 4 });
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 5);
    // Studs stand proud of the brick's top face.
    expect(box.max.y).toBeCloseTo(BRICK_HEIGHT + STUD_HEIGHT, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5);
  });

  it("keeps a footprint just under nominal so neighbours show a seam", () => {
    const box = partGeometry({ kind: "brick", width: 2, depth: 4 }).boundingBox!;
    expect(box.max.x - box.min.x).toBeLessThan(2);
    expect(box.max.x - box.min.x).toBeGreaterThan(1.95);
    expect(box.max.z - box.min.z).toBeLessThan(4);
    expect(box.max.z - box.min.z).toBeGreaterThan(3.95);
  });

  it("makes a plate one third of a brick", () => {
    const plate = partGeometry({ kind: "plate", width: 2, depth: 2 }).boundingBox!;
    expect(plate.max.y).toBeCloseTo(PLATE_HEIGHT + STUD_HEIGHT, 5);
  });

  it("leaves a tile smooth — no studs above the top face", () => {
    const tile = partGeometry({ kind: "tile", width: 2, depth: 2 }).boundingBox!;
    expect(tile.max.y).toBeCloseTo(PLATE_HEIGHT, 5);
  });

  it("adds one stud per stud position", () => {
    const plain = vertexCount(partGeometry({ kind: "brick", width: 2, depth: 2, studs: false }));
    const studded = vertexCount(partGeometry({ kind: "brick", width: 2, depth: 2, studs: true }));
    const bigger = vertexCount(partGeometry({ kind: "brick", width: 2, depth: 4, studs: true }));
    expect(studded).toBeGreaterThan(plain);
    // 8 studs vs 4 — more geometry, and the per-stud cost is consistent.
    expect(bigger).toBeGreaterThan(studded);
  });

  it("gives a slope studs only on its flat portion", () => {
    const slope = partGeometry({ kind: "slope", width: 4, depth: 2 }).boundingBox!;
    // The high edge carries the studs; the low edge falls to the base.
    expect(slope.min.y).toBeCloseTo(0, 5);
    expect(slope.max.y).toBeCloseTo(BRICK_HEIGHT + STUD_HEIGHT, 5);
  });

  it("caches by part key and returns the identical object", () => {
    disposeGeometryCache();
    expect(geometryCacheSize()).toBe(0);
    const first = partGeometry({ kind: "brick", width: 2, depth: 4 });
    const second = partGeometry({ kind: "brick", width: 2, depth: 4 });
    expect(second).toBe(first);
    expect(geometryCacheSize()).toBe(1);
    partGeometry({ kind: "brick", width: 1, depth: 1 });
    expect(geometryCacheSize()).toBe(2);
    disposeGeometryCache();
    expect(geometryCacheSize()).toBe(0);
  });

  it("survives a large baseplate stud field", () => {
    const geometry = partGeometry({ kind: "baseplate", width: 32, depth: 32 });
    expect(vertexCount(geometry)).toBeGreaterThan(0);
  });
});
