# fhshaik.github.io

Portfolio site, built on a LEGO library: the page background is an **authored
official LEGO set**, rendered with three.js, and the interface is dressed in the
same palette.

- **`/`** — the portfolio. Backdrop: LEGO 10281 Bonsai Tree (Cherry Blossoms).
- **`/lego`** — the library itself: the set catalogue, the parts, the interface kit.
- **`packages/lego`** — the library. See [its README](packages/lego/README.md).

## The one rule

The library **renders sets; it does not design builds.** Every LEGO model on the
site is an authored set from the [LDraw Official Model
Repository](https://library.ldraw.org/omr), credited to its author and
redistributed under CCAL 2.0. There is no procedural build generator.

## Develop

```bash
npm install
npm run dev          # local dev server
npm run build        # production build
npm start            # serve the production build
npm test             # unit tests (vitest)
npm run typecheck    # tsc --noEmit
npm run lint
```

Node `>=22.13`.

## Adding a LEGO set

```bash
# By OMR set id (find it at library.ldraw.org/omr/sets)
node scripts/import-ldraw-set.mjs 1383 --slug cherry-blossoms

# Or from a direct .mpd URL / local path
node scripts/import-ldraw-set.mjs https://library.ldraw.org/library/omr/21043-1.mpd --slug san-francisco
```

This writes three files into `public/ldraw/`:

| File | Purpose |
| --- | --- |
| `<slug>-packed.mpd` | Self-contained: the model plus every part it references and the colour table. Loads in one request. |
| `<slug>.mpd` | The original authored model, for download/inspection. |
| `<slug>-report.json` | Author, licence, part counts. |

Then register it in `packages/lego/src/core/sets.ts`. The importer refuses any
model not marked redistributable.

Verify a packed model parses headlessly:

```bash
node scripts/validate-ldraw-model.mjs public/ldraw/<slug>-packed.mpd
```

## Stack

Vite + vinext (Next-compatible app router) on Cloudflare Workers, React 19,
three.js, Tailwind v4 for the reset only — the site's own styling is the LEGO
token set.

### Known gaps

- `db/`, `worker/` and `examples/d1/` are unused scaffolding from the starter
  this branch began as. They carry three pre-existing `tsc` errors (missing
  Cloudflare Worker types); adding `@cloudflare/workers-types` globally breaks
  the DOM `Element` type, so they are left as-is.
- `next/link` is avoided: vinext `1.0.0-beta.2`'s prefetch throws
  `f is not a function` on mount. Plain anchors are used for internal links.
