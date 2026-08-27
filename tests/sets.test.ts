import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import {
  LEGO_SETS,
  LEGO_SET_LIST,
  legoSet,
  type LegoSet,
} from "../packages/lego/src/core/sets";
import { baseplate, boundsOf, nextBrickId } from "../packages/lego/src/core/layout";

describe("set catalogue", () => {
  it("registers at least one authored set", () => {
    expect(LEGO_SET_LIST.length).toBeGreaterThan(0);
  });

  it("looks a set up by slug and fails loudly on a typo", () => {
    expect(legoSet("cherry-blossoms").setNumber).toBe("10281");
    expect(() => legoSet("cherry-blossom")).toThrow(/Unknown LEGO set/);
  });

  it("credits an author and a redistributable licence for every set", () => {
    // The builds are other people's design work; the catalogue must say so.
    // Newer OMR submissions use Creative Commons wording rather than the older
    // "Redistributable under CCAL" phrasing, and CC BY / CC0 permit
    // redistribution just as well.
    const redistributable = /redistributable|CCAL|CC[\s-]?BY|CC0|public domain/i;
    for (const set of LEGO_SET_LIST) {
      expect(set.author, set.slug).toBeTruthy();
      expect(set.author, set.slug).not.toMatch(/unknown/i);
      expect(set.license, set.slug).toMatch(redistributable);
      // Either the OMR itself or the LDraw.org forums, where OMR-compliant
      // models are submitted before transfer.
      expect(set.source, set.slug).toMatch(/^https:\/\/(library|forums)\.ldraw\.org\//);
    }
  });

  it("points every set at a packed model that exists on disk", () => {
    for (const set of LEGO_SET_LIST) {
      const packed = new URL(`../public${set.url}`, import.meta.url);
      expect(existsSync(packed), `${set.slug}: ${set.url}`).toBe(true);
      // A packed model embeds its parts, so it is never tiny.
      expect(statSync(packed).size, set.slug).toBeGreaterThan(50_000);

      const original = new URL(`../public${set.originalUrl}`, import.meta.url);
      expect(existsSync(original), `${set.slug}: ${set.originalUrl}`).toBe(true);
    }
  });

  it("keys every entry by its own slug", () => {
    for (const [key, set] of Object.entries(LEGO_SETS as Record<string, LegoSet>)) {
      expect(set.slug).toBe(key);
    }
  });

  it("gives every set a sane framing footprint and part count", () => {
    for (const set of LEGO_SET_LIST) {
      expect(set.fitToStuds, set.slug).toBeGreaterThan(0);
      expect(set.placedParts, set.slug).toBeGreaterThan(0);
    }
  });
});

describe("parts helpers", () => {
  it("makes a baseplate that is not interactive", () => {
    const plate = baseplate(16, 16);
    expect(plate.part).toMatchObject({ kind: "baseplate", width: 16, depth: 16 });
    expect(plate.interactive).toBe(false);
  });

  it("issues unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => nextBrickId("x")));
    expect(ids.size).toBe(50);
  });

  it("measures a build's extent", () => {
    expect(boundsOf([])).toEqual({ width: 0, depth: 0, levels: 0 });
    expect(boundsOf([baseplate(8, 12)])).toMatchObject({ width: 8, depth: 12 });
  });
});
