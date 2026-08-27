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
}

export const LEGO_SETS = {
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
