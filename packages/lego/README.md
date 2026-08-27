# @fhshaik/lego

LEGO for the web: a renderer for **authored official LEGO sets**, the individual
parts generated to real LDraw measurements, and a matching interface kit — all
reading one token set.

```tsx
import { LegoBackdrop } from "@fhshaik/lego/react";
import { Button, Plate } from "@fhshaik/lego/ui";
import "@fhshaik/lego/lego.css";
```

## The one rule

**This library renders sets; it does not design builds.** Every LEGO model it
shows is an authored set from the [LDraw Official Model
Repository](https://library.ldraw.org/omr) — designed by a person, credited, and
redistributed under its own licence. There is no procedural build generator here,
deliberately: the aesthetic judgement in a LEGO build belongs to a set designer.

Individual *parts* are fair game and are generated in code — a brick is a brick.

## Layout

| Import | What it is |
| --- | --- |
| `@fhshaik/lego/tokens` | Palette (official LDraw values), LDU geometry, themes, motion curves |
| `@fhshaik/lego/core` | Framework-agnostic three.js: stage, part geometry, set catalogue, LDraw loader, petals |
| `@fhshaik/lego/react` | React bindings and the `LegoBackdrop` preset |
| `@fhshaik/lego/ui` | The 2D interface kit (no WebGL) |
| `@fhshaik/lego/lego.css` | Structural styles for the UI kit |

## Sets

The catalogue lives in `core/sets.ts`. Add a set with one command:

```bash
node scripts/import-ldraw-set.mjs <omrSetId>            # e.g. 1383 → 10281 Bonsai
node scripts/import-ldraw-set.mjs <mpdUrl> --slug name
```

The importer resolves the OMR page, downloads the authored `.mpd`, recursively
fetches every official part it references, and packs the whole thing — parts and
the `LDConfig.ldr` colour table included — into a single self-contained file in
`public/ldraw/`. That file loads in **one request** with no missing parts.

It refuses any model not marked redistributable, and records the author in a
report next to the packed file. Register the result in `LEGO_SETS`.

## 3D

```tsx
// The whole page background: a set, lit, with a scroll-driven camera sweep.
<LegoBackdrop
  set="cherry-blossoms"
  theme="blossom"
  petals={{ count: 130, area: 52 }}
  sweep={{ azimuth: 130, elevation: [12, 30], zoom: [1, 1.5] }}
  shift={0.22}
/>
```

Or compose it yourself:

```tsx
<LegoCanvas theme="studio" fog>
  <Baseplate width={20} depth={20} color="black" at={[-10, 0, -10]} />
  <LDrawModel src={set.url} fitToStuds={set.fitToStuds} />
  <Hotspot at={[0, 8, 0]} size={[5, 16, 5]} data="about" />
  <Petals count={140} />
</LegoCanvas>
```

### Units

Everything is in **stud units**: `1.0` is one stud pitch (20 LDU). A plate is
`0.4`, a brick `1.2`. Positions are `[x, level, z]` — studs across, **plates** up
— so a brick at level `0` puts the next one at level `3`. Loaded LDraw models are
scaled onto the same grid, so a real set and a loose part share one coordinate
system.

### Performance

- Part geometry and materials are cached and shared, so bricks with the same
  part and colour batch into a single `InstancedMesh`.
- Loaded sets are merged into a handful of draw calls (`LDrawUtils.mergeObject`).
- The stage renders **on demand** — an idle scene costs nothing. Registering a
  per-frame updater (petals, a sweep) switches it to continuous.
- `setFrameShift` moves the subject sideways by shifting the camera *frustum*, so
  a model can sit clear of a text column without shrinking the canvas.

## 2D

The interface is deliberately restrained: flat surfaces, hairline edges, one
accent. The LEGO lands in the **press** — a control drops 2px in 80ms and springs
back over 500ms, the timing of a brick seating onto a stud — and in a stud used
as punctuation. It does not draw bumps on every surface.

```tsx
<Button variant="accent">Selected work</Button>
<Plate accent="medium-azure" eyebrow="2026" title="Ant Geometer" meta="…" href="…" />
<Rail items={sections} active={active} onSelect={setActive} />
<Lines delay={0.15}>{["I build systems", "for curious"]}</Lines>
<Reveal delay={0.1}>…</Reveal>
```

`Button` renders an `<a>` with `href` and a `<button>` otherwise; `Plate` also
renders a `<div>` when it is not interactive — so an interactive card is always
keyboard-reachable without a synthetic `tabIndex`.

## Tokens

One source of truth. `legoTokensCss()` emits the palette, metrics and motion
curves as CSS custom properties; the three.js side imports the same TypeScript
values. Render it server-side so there is no flash:

```tsx
<style dangerouslySetInnerHTML={{ __html: legoTokensCss({ theme: "studio" }) }} />
```

Colour values are the official LDraw `!COLOUR` definitions, so a `"red"` swatch
in the UI and a `"red"` part inside a loaded set are the same red.

Themes: `studio` (dark, neutral), `blossom` (dark plum, pink accent),
`daylight` (light). Every 2D measurement derives from `--lego-pitch`, so one
value rescales the kit.

## Accessibility

- `prefers-reduced-motion` disables the petal field, the build-in drop, the
  scroll sweep and every reveal — handled in CSS where possible so there is no
  state update on mount.
- Canvases are `aria-hidden` with a text `label` describing the scene.
- The stud grid, brick edges and press states are decoration; nothing conveys
  information by colour alone.
