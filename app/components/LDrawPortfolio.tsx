"use client";

import { useState } from "react";
import { LegoBackdrop } from "@fhshaik/lego/react";
import { legoSet } from "@fhshaik/lego/core";
import { Button, Divider, Lines, Plate, Reveal, StudMark } from "@fhshaik/lego/ui";
import { useEffect } from "react";

const NAV = ["Work", "Research", "Experience"] as const;

/**
 * One set, toured. Each section is pinned to a place inside the painting, so
 * scrolling moves through 21333 rather than cutting between different builds.
 */
const TOUR = [
  { section: "top", region: "overview" },
  { section: "work", region: "village" },
  { section: "research", region: "swirls" },
  { section: "experience", region: "cypress" },
  { section: "credits", region: "easel" },
] as const;

const WORK = [
  {
    accent: "medium-azure" as const,
    year: "2026",
    title: "Ant Geometer",
    meta:
      "An RL environment testing whether LLM agents can infer hidden geometric structure through active exploration, across 11 manifolds and quotient spaces. The 132-task held-out benchmark scores frontier agents on recovering geometry from partial observations — Claude Opus 5 reached 0.48/1.00.",
    href: "https://github.com/fhshaik/ant-geometer",
  },
  {
    accent: "red" as const,
    year: "2026",
    title: "Autonomous Drone Racing",
    meta:
      "Anduril AI Grand Prix. A PPO policy trained in Isaac Sim/Pegasus for autonomous gate navigation with dynamics randomisation, plus a U-Net gate-segmentation model at 91% IoU feeding OpenCV PnP pose estimation and an EKF for closed-loop control.",
    href: "https://github.com/fhshaik/drone-gate-rl",
  },
  {
    accent: "bright-light-orange" as const,
    year: "2026",
    title: "Aglow",
    meta:
      "A social app with on-device ML: production recommendation and moderation systems built on WALS, ExecuTorch, CoreML and XNNPACK, serving 30K ranked recommendations across 600 users.",
  },
];

const RESEARCH = [
  {
    accent: "sand-green" as const,
    year: "PNAS Nexus · 2026",
    title: "Diffusive buckling fronts in lattice-based metamaterials",
    meta:
      "Jochem G. Meijer, Faadil H. Shaik, Victoria V. McDermott and Heinrich M. Jaeger. Oxford University Press.",
    href: "https://academic.oup.com/pnasnexus",
  },
];

const EXPERIENCE = [
  ["AI Engineer", "Cybersecurity startup · 2025–present"],
  ["Physics Researcher", "Jaeger Lab, University of Chicago · 2025"],
  ["B.S. Physics & Computer Science", "University of San Francisco · 2026"],
  ["Minors", "Astrophysics and Mathematics"],
];

const HONOURS = [
  ["Dean's Medal of Excellence", "University of San Francisco"],
  ["Putnam score 23", "2025"],
  ["Summa cum laude", "Physics & Computer Science"],
];

export default function LDrawPortfolio() {
  const [active, setActive] = useState<string>("Work");
  const bonsai = legoSet("cherry-blossoms");

  const current = legoSet("starry-night");

  // Each set brings its own mood: switching the root attribute repaints the
  // whole page palette, and globals.css transitions the colours so it reads as
  // a change of light rather than a flash.
  useEffect(() => {
    document.documentElement.dataset.legoTheme = current.theme ?? "studio";
  }, [current.theme]);

  return (
    <>
      <LegoBackdrop
        set="starry-night"
        tour={TOUR}
        parallax={3}
        shift={0.2}
        // Even, colour-true light and no cast shadows: the pigment is vivid, and
        // a key light only threw arbitrary shadows across the artwork.
        shadows={false}
        exposure={1}
        // Contact shadow in every seam and stud: this is what stops a
        // brick-built surface reading as flat colour.
        /*
         * Graphic, not photographic. Flat toon shading keeps each brick's own
         * pigment instead of washing it toward white, and the grade pushes the
         * whole frame into the painting's palette: ultramarine shadows, chrome
         * yellow lights.
         */
        painterly={{ steps: 4, saturate: 0.34 }}
        grade={{
          saturation: 1.42,
          contrast: 1.16,
          lift: 0.012,
          toning: 0.26,
          vignette: 0.38,
          shadowTint: "#14276e",
          highlightTint: "#ffd75a",
        }}
        // Kuwahara: smears within regions of colour but stops at edges, the way
        // a loaded brush does. Expensive, so the radius stays small.
        brushwork={false}
        /*
         * The only motion here is luminance: the coronas swell and fade, which
         * is what stars do. Nothing moves in space.
         *
         * Two spatial effects were tried and both rejected for causing motion
         * sickness — warping the sky (vortex) and swaying the camera (drift).
         * The pattern is consistent and worth respecting: a painting is
         * something the eye expects to hold still, and moving either the picture
         * or the viewpoint fights that expectation. Do not reintroduce either.
         */
        breathe={{ amount: 0.12, speed: 0.07 }}
        bloom={{ strength: 0.26, radius: 0.62, threshold: 0.8 }}
        /*
         * Only the village windows are lit from within — small, warm, and few.
         * The stars and moon are handled by the set's own halos instead:
         * brightening a brick does not read as light, the glow around it does.
         */
        glow={{ colors: ["orange"], intensity: 1.1, twinkle: 0.2, maxSize: 45 }}
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
            <a href="https://github.com/fhshaik" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://linkedin.com/in/faadil-shaik" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="/lego">Library</a>
          </nav>
        </header>

        <section className="world__opening" id="top">
          <Reveal as="p" className="world__eyebrow">
            <StudMark size={6} />
            ML engineer · Physics researcher
          </Reveal>
          <h1 className="world__title">
            <Lines delay={0.15}>{["I work on"]}</Lines>
            <Lines as="em" delay={0.34}>
              Physics and ML
            </Lines>
          </h1>
          <Reveal delay={0.5}>
            <p className="world__lede">
              ML engineer and physics researcher in San Francisco. I build{" "}
              <strong>AI agents at a cybersecurity startup</strong>, and I work in{" "}
              <strong>soft condensed matter</strong> — I derived the continuum theory in a PNAS
              Nexus paper on why lattice metamaterials buckle.
            </p>
          </Reveal>
          <Reveal className="world__actions" delay={0.6}>
            <Button
              variant="accent"
              onClick={() =>
                document.getElementById("work")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Work
            </Button>
            <span className="world__hint">
              <StudMark size={5} color="light-bluish-gray" />
              {current.view?.mode === "pan"
                ? "Scroll — move through the painting"
                : "Scroll — the set turns with you"}
            </span>
          </Reveal>
        </section>

        <section className="world__section" id="work">
          <Reveal>
            <Divider>Work</Divider>
          </Reveal>
          <div className="world__grid">
            {WORK.map((entry, index) => (
              <Reveal key={entry.title} delay={0.05 * index}>
                <Plate
                  studs={0}
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
            <h2 className="world__heading">Soft condensed matter</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              At the Jaeger Lab in Chicago I developed an analytical theory of diffusive buckling
              fronts in elastic metamaterials — a continuum model that explained the experimental
              observations and predicted how the fronts propagate. It became the theoretical basis
              of the paper below. Alongside it: Python simulations of elastic lattices,
              physics-informed neural networks for stress–strain behaviour in composite hydrogels,
              and OpenCV pipelines processing over 2 TB of experimental imagery to quantify
              deformation.
            </p>
          </Reveal>
          <div className="world__grid">
            {RESEARCH.map((entry) => (
              <Reveal key={entry.title} delay={0.14}>
                <Plate
                  studs={0}
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

        <section className="world__section" id="experience">
          <Reveal>
            <Divider>Experience</Divider>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="world__prose">
              I shipped a provider-agnostic agent framework for autonomous alert triage,
              handling tens of thousands of alerts a day across production tenants with tool
              orchestration and long-running workflows. An evaluation framework tests architecture
              changes before they deploy — one found a change that cut LLM inference cost per alert
              by 80%. I fine-tuned an 8B Llama-Nemotron on 478 production traces to 81% agreement
              with human analyst decisions, and built next-best-action recommendations across 78
              integrations that cut average triage time per alert by 25%.
            </p>
          </Reveal>
          <Reveal className="world__specs" delay={0.14}>
            {EXPERIENCE.map(([role, place]) => (
              <div className="world__spec" key={role}>
                <strong>{role}</strong>
                <span>{place}</span>
              </div>
            ))}
          </Reveal>
          <Reveal className="world__specs" delay={0.18}>
            {HONOURS.map(([value, label]) => (
              <div className="world__spec" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </Reveal>
        </section>

        <footer className="world__footer" id="credits">
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
