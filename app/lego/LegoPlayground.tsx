"use client";

import { useState } from "react";
import { LEGO_COLOR_LIST } from "@fhshaik/lego/tokens";
import { useEffect } from "react";
import { LEGO_SET_LIST, legoSet, type LegoSetSlug } from "@fhshaik/lego/core";
import { LegoBackdrop } from "@fhshaik/lego/react";
import { Button, Divider, Lines, Plate, Rail, Reveal, StudMark, Swatch } from "@fhshaik/lego/ui";

const SECTIONS = [
  { id: "sets", label: "Sets", accent: "red" },
  { id: "parts", label: "Parts", accent: "medium-azure" },
  { id: "interface", label: "Interface", accent: "bright-light-orange" },
  { id: "tokens", label: "Tokens", accent: "sand-green" },
] as const;

const PARTS = [
  ["Brick", "24 LDU · 3 plates"],
  ["Plate", "8 LDU"],
  ["Tile", "8 LDU · no studs"],
  ["Slope", "45° · one stud of run"],
  ["Round", "any diameter"],
  ["Baseplate", "4 LDU slab"],
];

export default function LegoPlayground() {
  const [set, setSet] = useState<LegoSetSlug>("cherry-blossoms");
  const [section, setSection] = useState<string>("sets");
  const current = legoSet(set);

  useEffect(() => {
    document.documentElement.dataset.legoTheme = current.theme ?? "studio";
  }, [current.theme]);

  return (
    <>
      <LegoBackdrop
        set={set}
        baseplateColor={set === "cherry-blossoms" ? "dark-brown" : "black"}
        sweep={{ azimuth: 150, elevation: [12, 32], zoom: [1, 1.5] }}
        parallax={5}
        shift={0.22}
        petals={
          set === "cherry-blossoms"
            ? { count: 120, area: 52, height: 34, speed: 0.95, sway: 2.1, size: 0.5 }
            : false
        }
      />

      <div className="world">
        <header className="world__masthead">
          {/*
            eslint-disable-next-line @next/next/no-html-link-for-pages --
            vinext 1.0.0-beta.2's <Link> prefetch throws "f is not a function"
            on mount; a plain anchor works and keeps the console clean.
          */}
          <a className="world__mark" href="/">
            <StudMark size={6} />
            @fhshaik/lego
          </a>
          <nav className="world__nav" aria-label="Sections">
            {SECTIONS.map((entry) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className={section === entry.id ? "is-active" : ""}
                onClick={() => setSection(entry.id)}
              >
                {entry.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="world__opening">
          <Reveal as="p" className="world__eyebrow">
            <StudMark size={6} />
            A LEGO library for the web
          </Reveal>
          <h1 className="world__title">
            <Lines delay={0.15}>{["Built from"]}</Lines>
            <Lines as="em" delay={0.32}>
              real sets.
            </Lines>
          </h1>
          <Reveal delay={0.42}>
            <p className="world__lede">
              The builds are <strong>authored official sets</strong> from the LDraw Official Model
              Repository — designed by people, not generated. The library renders them, supplies
              the parts, and dresses the interface in the same palette.
            </p>
          </Reveal>
          <Reveal className="world__actions" delay={0.52}>
            <Button
              variant="accent"
              onClick={() => document.getElementById("sets")?.scrollIntoView({ behavior: "smooth" })}
            >
              Browse the sets
            </Button>
            <span className="world__hint">
              <StudMark size={5} color="light-bluish-gray" />
              Scroll — the camera moves with you
            </span>
          </Reveal>
        </section>

        <section className="world__section" id="sets">
          <Reveal>
            <Divider>Official sets</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">The catalogue</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              Each set is imported from the OMR and packed into one self-contained file, so it
              loads in a single request with no missing parts. Pick one to place it behind this
              page.
            </p>
          </Reveal>

          <div className="world__grid">
            {LEGO_SET_LIST.map((entry, index) => (
              <Reveal key={entry.slug} delay={0.05 * index}>
                <Plate
                  accent={entry.slug === set ? "red" : "light-bluish-gray"}
                  selected={entry.slug === set}
                  eyebrow={`Set ${entry.setNumber}`}
                  title={entry.title}
                  meta={entry.note}
                  onClick={() => setSet(entry.slug as LegoSetSlug)}
                >
                  <span className="world__credit">
                    {entry.placedParts} parts · model by {entry.author}
                  </span>
                </Plate>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="world__prose">
              Adding another is one command: <code>node scripts/import-ldraw-set.mjs 1383</code>.
              The importer refuses anything not marked redistributable, and records the author.
            </p>
          </Reveal>
        </section>

        <section className="world__section" id="parts">
          <Reveal>
            <Divider>Parts</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">Generated to real LDraw measurements</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              Individual parts are built in code to the actual dimensions — a stud pitch is 20
              LDU, a plate is 8, a brick is 24 — and neighbours leave a 0.2 LDU seam, which is why
              a wall of them reads as separate bricks rather than one slab.
            </p>
          </Reveal>
          <Reveal className="world__specs" delay={0.14}>
            {PARTS.map(([name, detail]) => (
              <div className="world__spec" key={name}>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </Reveal>
        </section>

        <section className="world__section" id="interface">
          <Reveal>
            <Divider>Interface</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">The LEGO is in the click, not the bumps</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              Controls are flat with hairline edges and one accent. A press drops 2px in 80ms and
              springs back over 500ms — the timing of a brick seating onto a stud. That, and a
              stud used as punctuation, carries the reference further than shading every surface.
            </p>
          </Reveal>

          <Reveal className="world__row" delay={0.14}>
            <Button variant="accent">Accent</Button>
            <Button>Default</Button>
            <Button accent="medium-azure">Custom accent</Button>
            <Button variant="quiet">Quiet</Button>
            <Button disabled>Disabled</Button>
          </Reveal>

          <div className="world__panel">
            <Reveal delay={0.18}>
              <h3 className="world__subhead">Rail</h3>
              <Rail items={SECTIONS.map((s) => ({ ...s }))} active={section} onSelect={setSection} />
            </Reveal>
            <Reveal delay={0.24}>
              <h3 className="world__subhead">Plates</h3>
              <div className="world__grid" style={{ marginTop: 0 }}>
                <Plate
                  accent="medium-azure"
                  eyebrow="2026"
                  title="Ant Geometer"
                  meta="Discovering global geometry from local observations."
                />
                <Plate
                  accent="sand-green"
                  eyebrow="2025"
                  title="Spacetime Garden"
                  meta="A sandbox for relativistic geometry."
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="world__section" id="tokens">
          <Reveal>
            <Divider>Tokens</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">One palette, both halves</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              Colour values are the official LDraw definitions, so a swatch here and a part inside
              a loaded set are the same red. The 2D kit reads them as CSS variables; the three.js
              side imports the same source.
            </p>
          </Reveal>
          <Reveal className="world__swatches" delay={0.14}>
            {LEGO_COLOR_LIST.slice(0, 24).map((color) => (
              <Swatch key={color.name} color={color.name} label={color.label} />
            ))}
          </Reveal>
        </section>

        <footer className="world__footer">
          <Reveal>
            <p>
              Models by their LDraw authors, redistributed under CCAL 2.0. This library renders
              authored sets; it does not design builds.
            </p>
          </Reveal>
        </footer>
      </div>
    </>
  );
}
