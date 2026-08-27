/**
 * The set catalogue.
 *
 * Every LEGO build this library renders is an **authored official set** from the
 * LDraw Official Model Repository — designed by a person, not generated. Add a
 * set with:
 *
 * ```bash
 * node scripts/import-ldraw-set.mjs <omrSetId> --slug my-set
 * ```
 *
 * which writes a self-contained packed `.mpd` into `public/ldraw/` and a report
 * beside it. Register the result here.
 */

import type { LegoThemeName } from "../tokens/theme";

export interface LegoSet {
  /** Registry key and asset basename. */
  slug: string;
  /** LEGO set number, e.g. `"10281"`. */
  setNumber: string;
  /** Set name. */
  title: string;
  /** The LDraw contributor who authored the model. Always credit them. */
  author: string;
  /** Licence string from the model header. */
  license: string;
  /** OMR page or file the model came from. */
  source: string;
  /** Packed, self-contained model — loads with no further requests. */
  url: string;
  /** The original unpacked model, for download/inspection. */
  originalUrl: string;
  /** Parts placed in the authored build. */
  placedParts: number;
  /** Sensible footprint, in studs, when framing this set on its own. */
  fitToStuds: number;
  /** One line on why this set is in the catalogue. */
  note?: string;
  /**
   * Preferred camera angles, in degrees, for sets the default isometric sweep
   * suits badly. A wall panel like 21333 reads as a sliver from 45 degrees, so
   * it asks for a near head-on view and a shallow sweep.
   */
  view?: {
    /**
     * `"orbit"` (default) circles the set. `"pan"` puts the camera *inside* the
     * frame — close to the surface, tracking across it as the page scrolls,
     * which is the only way a flat wall panel reads well.
     */
    mode?: "orbit" | "pan";
    /** Azimuth at the top of the page. 0 looks straight down -z. */
    azimuth?: number;
    /** Elevation range across the scroll. */
    elevation?: [number, number];
    /** How many degrees the camera travels while scrolling. */
    sweep?: number;
    /** Draw a baseplate under the set. A wall panel wants none. */
    baseplate?: boolean;
    /**
     * Pan mode only. How much of the model's width the camera crosses (0–1),
     * and how close it sits as a fraction of the model's width.
     */
    pan?: { travel?: number; distance?: number; rise?: number };
  };
  /**
   * Named places within the set, for a scroll-driven tour.
   *
   * `focus` is normalised inside the model's bounding box — x from its left
   * edge to its right, y from its base to its top — so a region survives the
   * set being rescaled or reframed. `distance` is a fraction of the model's
   * largest dimension: smaller means closer in.
   */
  regions?: Record<string, { focus: [number, number]; distance: number; label?: string }>;
  /** Theme this set brings with it, so each build sets its own mood. */
  theme?: LegoThemeName;
  /** Lighting that suits the set. */
  lighting?: "studio" | "cosy" | "night";
}

export const LEGO_SETS = {
  "starry-night": {
    slug: "starry-night",
    setNumber: "21333",
    title: "Vincent van Gogh — The Starry Night",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 4.0",
    source: "https://forums.ldraw.org/thread-23358.html",
    url: "/ldraw/starry-night-packed.mpd",
    originalUrl: "/ldraw/starry-night.mpd",
    placedParts: 2302,
    fitToStuds: 55,
    note: "The painting as a brick-built relief, in its authored form.",
    // A wall panel: face it, barely move, and stand it on nothing.
    // Inside the frame: sit close to the canvas and track across it.
    view: {
      mode: "pan",
      azimuth: 0,
      elevation: [-2, 6],
      sweep: 12,
      baseplate: false,
      pan: { travel: 0.62, distance: 0.42, rise: 0.16 },
    },
    regions: {
      // Coordinates read off the authored build: the cypress stands left of
      // centre, the swirls fill the upper middle, the village sits low right.
      overview: { focus: [0.5, 0.55], distance: 0.78, label: "The whole canvas" },
      cypress: { focus: [0.34, 0.46], distance: 0.44, label: "The cypress" },
      swirls: { focus: [0.58, 0.7], distance: 0.46, label: "The swirling sky" },
      moon: { focus: [0.84, 0.74], distance: 0.4, label: "The crescent moon" },
      village: { focus: [0.7, 0.28], distance: 0.44, label: "The village" },
      easel: { focus: [0.9, 0.24], distance: 0.38, label: "Vincent at his easel" },
    },
    theme: "starry",
    lighting: "night",
  },
  "cherry-blossoms": {
    slug: "cherry-blossoms",
    setNumber: "10281",
    title: "Bonsai Tree — Cherry Blossoms",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/1383",
    url: "/ldraw/10281-cherry-blossoms-packed.mpd",
    originalUrl: "/ldraw/10281-cherry-blossoms.mpd",
    placedParts: 753,
    fitToStuds: 26,
    note: "The cherry-blossom configuration of the Bonsai Tree, in its authored form.",
    theme: "blossom",
    lighting: "cosy",
  },
  "tranquil-garden": {
    slug: "tranquil-garden",
    setNumber: "10315",
    title: "Tranquil Garden",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/10315-1.mpd",
    url: "/ldraw/tranquil-garden-packed.mpd",
    originalUrl: "/ldraw/tranquil-garden.mpd",
    placedParts: 1341,
    fitToStuds: 32,
    note: "Icons Botanicals — a zen garden with a koi pond and a maple.",
    theme: "garden",
    lighting: "cosy",
  },
  "flower-bouquet": {
    slug: "flower-bouquet",
    setNumber: "10280",
    title: "Flower Bouquet",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/1382",
    url: "/ldraw/flower-bouquet-packed.mpd",
    originalUrl: "/ldraw/flower-bouquet.mpd",
    placedParts: 750,
    fitToStuds: 46,
    note: "Botanicals — roses, snapdragons and poppies, all in brick.",
    theme: "garden",
    lighting: "cosy",
  },
  "fountain-garden": {
    slug: "fountain-garden",
    setNumber: "10359",
    title: "Fountain Garden",
    author: "Orion Pobursky [OrionP]",
    license: "Licenced under CC BY 4.0",
    source: "https://library.ldraw.org/library/omr/10359-1.mpd",
    url: "/ldraw/fountain-garden-packed.mpd",
    originalUrl: "/ldraw/fountain-garden.mpd",
    placedParts: 1215,
    fitToStuds: 30,
    note: "Botanicals — a tiered fountain ringed with planting.",
    theme: "garden",
    lighting: "cosy",
  },
  "tree-house": {
    slug: "tree-house",
    setNumber: "21318",
    title: "Tree House (Autumn)",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/1286",
    url: "/ldraw/tree-house-packed.mpd",
    originalUrl: "/ldraw/tree-house.mpd",
    placedParts: 3028,
    fitToStuds: 59,
    note: "LEGO Ideas — the autumn-leaf configuration. Large: prefer it as a hero.",
    theme: "garden",
    lighting: "cosy",
  },
  "san-francisco": {
    slug: "san-francisco",
    setNumber: "21043",
    title: "San Francisco",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/1093",
    url: "/ldraw/san-francisco-packed.mpd",
    originalUrl: "/ldraw/san-francisco.mpd",
    placedParts: 567,
    fitToStuds: 36,
    note: "Architecture Skylines — the Golden Gate, Painted Ladies and Transamerica.",
    theme: "harbour",
    lighting: "studio",
  },
  "tokyo": {
    slug: "tokyo",
    setNumber: "21051",
    title: "Tokyo",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/1161",
    url: "/ldraw/tokyo-packed.mpd",
    originalUrl: "/ldraw/tokyo.mpd",
    placedParts: 541,
    fitToStuds: 34,
    note: "Architecture Skylines — Shibuya, the Tokyo Tower and Mode Gakuen.",
    theme: "harbour",
    lighting: "studio",
  },
  "colosseum": {
    slug: "colosseum",
    setNumber: "10276",
    title: "Colosseum",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/10276-1.mpd",
    url: "/ldraw/colosseum-packed.mpd",
    originalUrl: "/ldraw/colosseum.mpd",
    placedParts: 9060,
    fitToStuds: 75,
    note: "The largest set here — 9,060 parts. Instanced, or it will not fit in memory.",
    theme: "studio",
    lighting: "studio",
  },
  "grand-piano": {
    slug: "grand-piano",
    setNumber: "21323",
    title: "Grand Piano",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/21323-1.mpd",
    url: "/ldraw/grand-piano-packed.mpd",
    originalUrl: "/ldraw/grand-piano.mpd",
    placedParts: 3661,
    fitToStuds: 30,
    note: "LEGO Ideas — a working grand piano.",
    theme: "studio",
    lighting: "cosy",
  },
  "pizza-to-go": {
    slug: "pizza-to-go",
    setNumber: "10036",
    title: "Pizza To Go",
    author: "Robert Paciorek [bercik]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/omr/sets/658",
    url: "/ldraw/pizza-to-go-packed.mpd",
    originalUrl: "/ldraw/pizza-to-go.mpd",
    placedParts: 166,
    fitToStuds: 22,
    note: "A small Town-era storefront — a compact set that loads fast.",
    theme: "studio",
    lighting: "cosy",
  },
  "venice": {
    slug: "venice",
    setNumber: "21026",
    title: "Venice",
    author: "Damien Roux [Darats]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/21026-1.mpd",
    url: "/ldraw/venice-packed.mpd",
    originalUrl: "/ldraw/venice.mpd",
    placedParts: 210,
    fitToStuds: 32,
    note: "Architecture Skylines — St Mark's, the Rialto and a gondola.",
    theme: "harbour",
    lighting: "cosy",
  },
  "new-york-city": {
    slug: "new-york-city",
    setNumber: "21028",
    title: "New York City",
    author: "Damien Roux [Darats]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/21028-1.mpd",
    url: "/ldraw/new-york-city-packed.mpd",
    originalUrl: "/ldraw/new-york-city.mpd",
    placedParts: 597,
    fitToStuds: 32,
    note: "Architecture Skylines — the Chrysler, Empire State and Flatiron.",
    theme: "harbour",
    lighting: "studio",
  },
  "sydney-opera-house": {
    slug: "sydney-opera-house",
    setNumber: "21012",
    title: "Sydney Opera House",
    author: "Damien Roux [Darats]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/21012-1.mpd",
    url: "/ldraw/sydney-opera-house-packed.mpd",
    originalUrl: "/ldraw/sydney-opera-house.mpd",
    placedParts: 270,
    fitToStuds: 20,
    note: "Architecture — the shells, in white curved slopes.",
    theme: "harbour",
    lighting: "studio",
  },
  "fallingwater": {
    slug: "fallingwater",
    setNumber: "21005",
    title: "Fallingwater",
    author: "Orion Pobursky [OrionP]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/21005-1.mpd",
    url: "/ldraw/fallingwater-packed.mpd",
    originalUrl: "/ldraw/fallingwater.mpd",
    placedParts: 803,
    fitToStuds: 32,
    note: "Architecture — Frank Lloyd Wright's cantilevered terraces.",
    theme: "garden",
    lighting: "cosy",
  },
  "boutique-hotel": {
    slug: "boutique-hotel",
    setNumber: "10297",
    title: "Boutique Hotel",
    author: "Philippe Hurbain [Philo]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/10297-1.mpd",
    url: "/ldraw/boutique-hotel-packed.mpd",
    originalUrl: "/ldraw/boutique-hotel.mpd",
    placedParts: 3164,
    fitToStuds: 32,
    note: "Modular Buildings — a corner hotel with an art gallery.",
    theme: "studio",
    lighting: "cosy",
  },
  "bookshop": {
    slug: "bookshop",
    setNumber: "10270",
    title: "Bookshop",
    author: "Ulrich Röder [UR]",
    license: "Redistributable under CCAL version 2.0",
    source: "https://library.ldraw.org/library/omr/10270-1.mpd",
    url: "/ldraw/bookshop-packed.mpd",
    originalUrl: "/ldraw/bookshop.mpd",
    placedParts: 2456,
    fitToStuds: 32,
    note: "Modular Buildings — a bookshop beside a townhouse.",
    theme: "studio",
    lighting: "cosy",
  },
} as const satisfies Record<string, LegoSet>;

export type LegoSetSlug = keyof typeof LEGO_SETS;

export const LEGO_SET_LIST: readonly LegoSet[] = Object.values(LEGO_SETS);

/** Look up a set by slug. Throws on an unknown slug so typos fail loudly. */
export function legoSet(slug: LegoSetSlug | string): LegoSet {
  const found = (LEGO_SETS as Record<string, LegoSet>)[slug];
  if (!found) {
    throw new Error(
      `Unknown LEGO set "${slug}". Registered: ${Object.keys(LEGO_SETS).join(", ")}`,
    );
  }
  return found;
}
