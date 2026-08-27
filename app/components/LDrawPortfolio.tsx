"use client";

import { useState } from "react";
import { LegoBackdrop } from "@fhshaik/lego/react";
import { legoSet } from "@fhshaik/lego/core";
import { Button, Divider, Lines, Plate, Reveal, StudMark } from "@fhshaik/lego/ui";
import { useSectionSet } from "../useSectionSet";

const NAV = ["Work", "Research", "Experience"] as const;

/**
 * Each section names the set that stands behind it. The backdrop follows the
 * scroll, so the page moves through a few different builds rather than staring
 * at one for its whole length.
 */
const SECTION_SETS: Record<string, string> = {
  top: "cherry-blossoms",
  work: "san-francisco",
  research: "flower-bouquet",
  experience: "pizza-to-go",
};

const WORK = [
  {
    accent: "medium-azure" as const,
    year: "2026",
    title: "Ant Geometer",
    meta: "A benchmark for discovering global geometry from local observations.",
    href: "https://github.com/fhshaik/ant-geometer",
  },
  {
    accent: "red" as const,
    year: "2024",
    title: "Dark Matter Lensing CNN",
    meta: "A ray tracer for gravitational lensing, then a CNN trained to 95% detection accuracy.",
    href: "https://github.com/fhshaik/Dark-Matter-Lensing-CNN",
  },
  {
    accent: "sand-green" as const,
    year: "2026",
    title: "Spacetime Garden",
    meta: "A simulation sandbox for relativistic geometry.",
    href: "https://github.com/fhshaik/spacetime-garden",
  },
  {
    accent: "bright-light-orange" as const,
    year: "2026",
    title: "Drone Gate RL",
    meta: "Training a quadrotor to race physical gates with PyBullet and reinforcement learning.",
    href: "https://github.com/fhshaik/drone-gate-rl",
  },
];

const EXPERIENCE = [
  ["Security engineering", "Alaris"],
  ["Scientific ML", "Benchmarks & simulation"],
  ["Graphics", "Ray tracers, relativistic rendering"],
  ["Infrastructure", "Terraform, Kubernetes, Cloudflare"],
];

export default function LDrawPortfolio() {
  const [active, setActive] = useState<string>("Work");
  const bonsai = legoSet("cherry-blossoms");

  const set = useSectionSet(SECTION_SETS, "cherry-blossoms");
  const isBlossom = set === "cherry-blossoms";

  return (
    <>
      <LegoBackdrop
        set={set}
        theme="blossom"
        lighting="cosy"
        baseplate={isBlossom ? 20 : 30}
        baseplateColor="dark-brown"
        sweep={{ azimuth: 130, elevation: [12, 30], zoom: [1, 1.5] }}
        parallax={4}
        shift={0.22}
        petals={
          isBlossom
            ? { count: 130, area: 52, height: 34, speed: 0.95, sway: 2.1, size: 0.5 }
            : false
        }
        preload={["san-francisco", "flower-bouquet"]}
      />

      <div className="world">
        <header className="world__masthead">
          <a className="world__mark" href="#top">
            <StudMark size={6} />
            Faadil Shaik
          </a>
          <nav className="world__nav" aria-label="Sections">
            {NAV.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={active === item ? "is-active" : ""}
                onClick={() => setActive(item)}
              >
                {item}
              </a>
            ))}
            <a href="/lego">Library</a>
          </nav>
        </header>

        <section className="world__opening" id="top">
          <Reveal as="p" className="world__eyebrow">
            <StudMark size={6} />
            Physics · Machine learning · Software
          </Reveal>
          <h1 className="world__title">
            <Lines delay={0.15}>{["I build systems", "for curious"]}</Lines>
            <Lines as="em" delay={0.42}>
              worlds.
            </Lines>
          </h1>
          <Reveal delay={0.5}>
            <p className="world__lede">
              I work on simulation, scientific machine learning, and the infrastructure that
              makes both reproducible. The set behind this page is{" "}
              <strong>
                {bonsai.setNumber} {bonsai.title}
              </strong>
              , rendered from its authored LDraw model.
            </p>
          </Reveal>
          <Reveal className="world__actions" delay={0.6}>
            <Button
              variant="accent"
              onClick={() =>
                document.getElementById("work")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Selected work
            </Button>
            <span className="world__hint">
              <StudMark size={5} color="light-bluish-gray" />
              Scroll — the set turns with you
            </span>
          </Reveal>
        </section>

        <section className="world__section" id="work">
          <Reveal>
            <Divider>Work</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">Four things worth reading the code of</h2>
          </Reveal>
          <div className="world__grid">
            {WORK.map((entry, index) => (
              <Reveal key={entry.title} delay={0.05 * index}>
                <Plate
                  accent={entry.accent}
                  eyebrow={entry.year}
                  title={entry.title}
                  meta={entry.meta}
                  href={entry.href}
                  external
                />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="world__section" id="research">
          <Reveal>
            <Divider>Research</Divider>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="world__heading">Honest baselines over impressive demos</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              Most of my research work is about making claims checkable: reproducible experiment
              infrastructure, benchmarks with real baselines, and simulations whose failure modes
              are written down rather than cropped out.
            </p>
          </Reveal>
        </section>

        <section className="world__section" id="experience">
          <Reveal>
            <Divider>Experience</Divider>
          </Reveal>
          <Reveal className="world__specs" delay={0.08}>
            {EXPERIENCE.map(([role, place]) => (
              <div className="world__spec" key={role}>
                <strong>{role}</strong>
                <span>{place}</span>
              </div>
            ))}
          </Reveal>
        </section>

        <footer className="world__footer">
          <Reveal>
            <p>
              LEGO set {bonsai.setNumber} model by {bonsai.author}, redistributed under CCAL 2.0
              via the{" "}
              <a href={bonsai.source} target="_blank" rel="noreferrer">
                LDraw Official Model Repository
              </a>
              . Rendered with <a href="/lego">@fhshaik/lego</a>.
            </p>
          </Reveal>
        </footer>
      </div>
    </>
  );
}
