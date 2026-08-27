import { describe, expect, it } from "vitest";
import {
  BRICK_HEIGHT,
  LDU_PER_STUD,
  LEGO_COLORS,
  PLATE_HEIGHT,
  PLATES_PER_BRICK,
  colorByCode,
  legoTokensCss,
  resolveColor,
  shade,
} from "../packages/lego/src/tokens";

describe("colours", () => {
  it("uses the official LDraw value for a known colour", () => {
    // Straight from LDConfig.ldr, so bricks match loaded LDraw models exactly.
    expect(LEGO_COLORS.red.hex).toBe("#B40000");
    expect(LEGO_COLORS.red.code).toBe(4);
    expect(LEGO_COLORS.yellow.code).toBe(14);
  });

  it("looks colours up by LDraw code", () => {
    expect(colorByCode(4)?.name).toBe("red");
    expect(colorByCode(99999)).toBeUndefined();
  });

  it("resolves names, codes, and raw hex", () => {
    expect(resolveColor("red").hex).toBe("#B40000");
    expect(resolveColor(14).name).toBe("yellow");
    expect(resolveColor("#ff8800").hex).toBe("#ff8800");
    expect(() => resolveColor("chartreuse")).toThrow(/Unknown LEGO colour/);
  });

  it("derives an edge colour for a custom hex so 2D shading still works", () => {
    expect(resolveColor("#ff8800").edge).not.toBe("#ff8800");
  });

  it("marks transparent colours with alpha below 1", () => {
    expect(LEGO_COLORS["trans-red"].alpha).toBeLessThan(1);
    expect(LEGO_COLORS["trans-red"].finish).toBe("transparent");
    expect(LEGO_COLORS.red.alpha).toBe(1);
  });

  it("lightens and darkens without leaving the byte range", () => {
    expect(shade("#000000", 1)).toBe("#ffffff");
    expect(shade("#ffffff", -1)).toBe("#000000");
    expect(shade("#808080", 0)).toBe("#808080");
    expect(shade("#abc", 0)).toBe("#aabbcc");
  });
});

describe("dimensions", () => {
  it("keeps the LDraw ratios", () => {
    expect(LDU_PER_STUD).toBe(20);
    expect(PLATE_HEIGHT).toBeCloseTo(0.4);
    expect(BRICK_HEIGHT).toBeCloseTo(1.2);
    // A brick is exactly three plates — the whole grid depends on this.
    expect(BRICK_HEIGHT).toBeCloseTo(PLATE_HEIGHT * PLATES_PER_BRICK);
  });
});

describe("token CSS", () => {
  const css = legoTokensCss();

  it("emits a variable per palette colour", () => {
    expect(css).toContain("--lego-color-red:#B40000");
    expect(css).toContain("--lego-edge-red:");
    expect(css).toContain("--lego-top-red:");
  });

  it("emits motion tokens", () => {
    expect(css).toContain("--lego-ease-glide:cubic-bezier(0.16, 1, 0.3, 1)");
    // The press is asymmetric on purpose: a brick drops fast, settles slowly.
    expect(css).toContain("--lego-press-down:80ms");
    expect(css).toContain("--lego-press-up:500ms");
  });

  it("emits no floating-point noise in calc() ratios", () => {
    expect(css).not.toMatch(/\d\.\d{6,}/);
  });

  it("derives every 2D metric from a single pitch", () => {
    expect(css).toContain("--lego-pitch:1.75rem");
    expect(css).toContain("--lego-stud:calc(var(--lego-pitch)");
    expect(css).toContain("--lego-brick-height:calc(var(--lego-pitch)");
  });

  it("emits switchable theme blocks", () => {
    expect(css).toContain('[data-lego-theme="daylight"]');
    expect(css).toContain('[data-lego-theme="studio"]');
  });

  it("honours a custom pitch and can skip theme selectors", () => {
    const custom = legoTokensCss({ pitch: "20px", includeThemeSelectors: false });
    expect(custom).toContain("--lego-pitch:20px");
    expect(custom).not.toContain("[data-lego-theme");
  });

  it("hardcodes no colour the palette does not define", () => {
    // Guards the invariant that 2D and 3D cannot drift apart.
    const declared = new Set(
      Object.values(LEGO_COLORS).flatMap((color) => [
        color.hex.toLowerCase(),
        color.edge.toLowerCase(),
      ]),
    );
    const used = css.match(/--lego-(?:color|edge)-[a-z-]+:(#[0-9a-f]{6})/gi) ?? [];
    for (const entry of used) {
      const hex = entry.slice(entry.indexOf("#")).toLowerCase();
      expect(declared).toContain(hex);
    }
  });
});
