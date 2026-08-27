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
    fitToStuds: 13.5,
    note: "The cherry-blossom configuration of the Bonsai Tree, in its authored form.",
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
    fitToStuds: 16,
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
