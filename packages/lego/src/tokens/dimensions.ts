/**
 * LEGO geometry, in one unit system.
 *
 * The canonical measurements are LDraw Units (LDU): 1 stud pitch = 20 LDU,
 * a plate is 8 LDU tall, a brick is 24 LDU (three plates). Everything the
 * library builds is expressed in **stud units** — 1.0 = one stud pitch — so a
 * 2x4 brick is 2 x 4 wide and 1.2 tall. LDraw models are scaled by
 * {@link LDU_TO_STUDS} on import and land on the same grid.
 */

/** LDU in one stud pitch. The constant every other measurement derives from. */
export const LDU_PER_STUD = 20;

/** Multiply raw LDraw coordinates by this to reach stud units. */
export const LDU_TO_STUDS = 1 / LDU_PER_STUD;

const ldu = (value: number) => value * LDU_TO_STUDS;

/** Centre-to-centre stud spacing. 1 by definition. */
export const STUD_PITCH = 1;
/** Height of one plate (8 LDU). */
export const PLATE_HEIGHT = ldu(8);
/** Height of one brick (24 LDU = 3 plates). */
export const BRICK_HEIGHT = ldu(24);
export const PLATES_PER_BRICK = 3;
/** Height of a baseplate slab (4 LDU — half a plate). */
export const BASEPLATE_HEIGHT = ldu(4);
/** Stud radius (6 LDU). */
export const STUD_RADIUS = ldu(6);
/** How far a stud stands proud of the surface it sits on (4 LDU). */
export const STUD_HEIGHT = ldu(4);
/**
 * Per-side gap so neighbouring parts read as separate bricks instead of
 * z-fighting into one slab (0.2 LDU, matching real LDraw part clearance).
 */
export const PART_CLEARANCE = ldu(0.2);
/** Edge rounding on brick bodies (0.6 LDU). */
export const EDGE_BEVEL = ldu(0.6);
/** Horizontal run of a 45-degree slope: exactly one stud. */
export const SLOPE_RUN = 1;

/** Height in stud units of `count` plates. */
export const plates = (count: number) => count * PLATE_HEIGHT;
/** Height in stud units of `count` bricks. */
export const bricks = (count: number) => count * BRICK_HEIGHT;
/** Convert a plate count to the brick count it represents. */
export const platesToBricks = (count: number) => count / PLATES_PER_BRICK;

/** Default plate-height for each part kind. */
export const DEFAULT_HEIGHT_PLATES = {
  brick: 3,
  plate: 1,
  tile: 1,
  slope: 3,
  round: 3,
  cone: 3,
  baseplate: 0.5,
} as const;

/**
 * 2D metrics for the UI kit, as multiples of one stud pitch. The CSS variable
 * `--lego-pitch` sets the pitch in px/rem; every other 2D measurement is
 * `calc()`-derived from it, so the whole kit scales from a single value.
 */
export const UI_RATIOS = {
  /** Visible stud diameter relative to pitch. */
  stud: (STUD_RADIUS * 2) / STUD_PITCH,
  /** How tall a stud reads in 2D. */
  studRise: STUD_HEIGHT / STUD_PITCH,
  brick: BRICK_HEIGHT / STUD_PITCH,
  plate: PLATE_HEIGHT / STUD_PITCH,
  radius: EDGE_BEVEL / STUD_PITCH,
} as const;

/** Default pitch for the 2D kit. Override with the `pitch` token option. */
export const UI_DEFAULT_PITCH = "1.75rem";
