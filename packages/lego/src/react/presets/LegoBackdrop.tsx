"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as THREE from "three";
import { legoSet, type LegoSetSlug } from "../../core/sets";
import { preloadLDrawModel } from "../../core/ldraw";
import type { LegoPickEvent } from "../../core/stage";
import type { LegoThemeName } from "../../tokens/theme";
import { LegoCanvas } from "../LegoCanvas";
import type { PetalsProps } from "../Petals";
import { LDrawModel } from "../LDrawModel";
import { Baseplate } from "../bricks";
import { Petals } from "../Petals";
import { Glow } from "../Glow";
import type { GradeOptions } from "../../core/grade";
import { useLegoStage } from "../context";

export interface LegoBackdropProps {
  /** Official set to place in the world. */
  set?: LegoSetSlug | string;
  theme?: LegoThemeName;
  lighting?: "cosy" | "studio" | "night" | "gallery";
  /** Tone-mapping exposure. Below 1 darkens. */
  exposure?: number;
  /**
   * Shadow-mapped self-shadowing. Off for a painting: a key light throws
   * arbitrary shadows across the artwork.
   */
  shadows?: boolean;
  /** Studded baseplate under the set. Set to 0 to omit it. */
  baseplate?: number;
  baseplateColor?: string;
  /**
   * Camera sweep across the full scroll range. The camera eases toward the
   * scroll-derived view every frame, so the motion flows rather than steps.
   */
  sweep?: {
    /** Degrees of rotation from the top of the page to the bottom. */
    azimuth?: number;
    /** Degrees of elevation at the top and at the bottom. */
    elevation?: [number, number];
    /** Distance multiplier at the top and at the bottom. */
    zoom?: [number, number];
  };
  /** Degrees the camera drifts with the pointer. 0 disables it. */
  parallax?: number;
  /**
   * Pushes the set sideways within the viewport, as a fraction of its width, so
   * it stays clear of a text column. Applied on wide viewports only — on narrow
   * ones the set re-centres and the copy sits over it.
   */
  shift?: number;
  /** Drop the set into place on first load. */
  buildIn?: boolean;
  /**
   * Falling LEGO petals. `true` uses the blossom defaults; pass an object to
   * tune count, spread, or colours. Off under `prefers-reduced-motion`.
   */
  petals?: boolean | PetalsProps;
  /** Atmospheric depth. Defaults to true. */
  fog?: boolean;
  /** Bright surfaces bleed light. Costs a full-screen pass. */
  bloom?: boolean | { strength?: number; radius?: number; threshold?: number };
  /** Contact shadow in the seams between bricks. */
  ao?: boolean | { radius?: number; intensity?: number };
  /** Upgrade the loaded model's materials to physical plastic. Photographic. */
  plastic?: boolean | { clearcoat?: number; roughness?: number };
  /**
   * Flat, graphic toon shading — the opposite treatment to `plastic`, and the
   * one that makes a build read as a painting rather than a photograph.
   */
  painterly?: boolean | { steps?: number; saturate?: number };
  /** Colour grade: saturation, contrast, split-tone, vignette. */
  grade?: boolean | GradeOptions;
  /** Kuwahara brushstroke filter. Expensive. */
  brushwork?: boolean | { radius?: number; strength?: number };
  /**
   * Animate the set's declared swirl centres, so the image churns without any
   * brick moving. Warps geometry edges — suits a painting.
   */
  vortex?: boolean;
  /** Halos swell and fade slowly. */
  breathe?: boolean | { amount?: number; speed?: number };
  /**
   * Slow camera sway, in degrees. The viewer drifts; the subject stays put,
   * which is the honest way to animate something that hangs on a wall.
   */
  drift?: number;
  /** LEGO colours that should emit light, with an optional twinkle. */
  glow?:
    | readonly string[]
    | {
        colors: readonly string[];
        intensity?: number;
        twinkle?: number;
        maxSize?: number;
        maxElongation?: number;
      };
  /**
   * Other sets to parse in the background, so switching to one is instant.
   * Warmed after the current set is on screen, on an idle callback.
   */
  preload?: readonly (LegoSetSlug | string)[];
  /**
   * A scroll-driven tour: each entry pins a section of the page to a named
   * region of the set. The camera eases from one region to the next in step
   * with the actual scroll position, so a heading and the place it talks about
   * arrive together.
   *
   * Takes precedence over `sweep` when the set defines matching regions.
   */
  tour?: readonly { section: string; region: string }[];
  onPick?: (event: LegoPickEvent | null) => void;
  /** Let pointer events reach the scene. Off by default so the page scrolls. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  label?: string;
}

// Pull *back* as the page scrolls: the set should recede behind the copy, not
// grow into it.
const DEFAULT_SWEEP = {
  azimuth: 150,
  elevation: [14, 30] as [number, number],
  zoom: [1, 1.55] as [number, number],
};

/**
 * A full-viewport LEGO world behind the page.
 *
 * Fixed to the viewport and unframed, so the page background *is* the scene
 * rather than a boxed-in widget. Scroll drives a continuous camera sweep and
 * the pointer adds a small parallax drift; both ease toward their target, and
 * both stop under `prefers-reduced-motion`.
 */
export function LegoBackdrop({
  set = "cherry-blossoms",
  theme,
  lighting,
  baseplate = 24,
  baseplateColor = "sand-green",
  sweep,
  parallax = 5,
  buildIn = true,
  petals = false,
  fog = true,
  exposure,
  shadows,
  bloom = false,
  ao = false,
  plastic = false,
  painterly = false,
  grade = false,
  brushwork = false,
  vortex = false,
  breathe = false,
  drift = 0,
  glow,
  preload,
  tour,
  shift = 0.2,
  onPick,
  interactive = false,
  className,
  style,
  children,
  label,
}: LegoBackdropProps) {
  const resolved = legoSet(set);
  // The sweep must not snapshot a camera distance until the *model* is in the
  // scene: the baseplate alone satisfies any bounds-based readiness test, which
  // left the camera framed for an empty plate.
  //
  // Recorded as "which url is loaded" rather than a boolean, so switching sets
  // invalidates it by derivation instead of by resetting state in an effect.
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const modelReady = readyUrl === resolved.url;

  // A baseplate should be comfortably larger than the set standing on it.
  const wantsPlate = resolved.view?.baseplate ?? true;
  const plateSize =
    baseplate === 0 || !wantsPlate
      ? 0
      : Math.max(baseplate, Math.round(resolved.fitToStuds * 1.15));

  // A set may declare the angles that suit it; an explicit `sweep` prop still
  // wins, so a page can always override.
  const hinted = resolved.view
    ? {
        azimuth: resolved.view.sweep ?? DEFAULT_SWEEP.azimuth,
        elevation: resolved.view.elevation ?? DEFAULT_SWEEP.elevation,
        zoom: DEFAULT_SWEEP.zoom,
      }
    : {};
  const resolvedSweep = { ...DEFAULT_SWEEP, ...hinted, ...sweep };
  const startAzimuth = resolved.view?.azimuth ?? 0;
  const mode = resolved.view?.mode ?? "orbit";
  const pan = resolved.view?.pan;

  return (
    <div
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: interactive ? "auto" : "none",
        ...style,
      }}
    >
      <LegoCanvas
        theme={theme ?? resolved.theme ?? "studio"}
        lighting={lighting ?? resolved.lighting ?? "cosy"}
        orbit={false}
        autoFrame
        fog={fog}
        exposure={exposure}
        shadows={shadows}
        bloom={bloom}
        ao={ao}
        grade={grade}
        brushwork={brushwork}
        vortex={vortex}
        onPick={interactive ? onPick : undefined}
        label={label}
      >
        {plateSize > 0 ? (
          <Baseplate
            width={plateSize}
            depth={plateSize}
            color={baseplateColor}
            at={[-plateSize / 2, 0, -plateSize / 2]}
          />
        ) : null}

        <LDrawModel
          src={resolved.url}
          fitToStuds={resolved.fitToStuds}
          halos={resolved.halos}
          at={[0, 0.5, 0]}
          onStatusChange={(status) => setReadyUrl(status === "ready" ? resolved.url : null)}
        />

        {preload && preload.length > 0 ? <Preload slugs={preload} /> : null}

        {modelReady ? (
          <ScrollSweep
            sweep={resolvedSweep}
            startAzimuth={startAzimuth}
            mode={mode}
            pan={pan}
            tour={tour}
            regions={resolved.regions}
            drift={drift}
            vortices={vortex ? resolved.vortices : undefined}
            parallax={parallax}
            buildIn={buildIn}
            shift={shift}
          />
        ) : null}
        {petals ? <Petals {...(typeof petals === "object" ? petals : {})} /> : null}
        {plastic && modelReady ? (
          <Plastic {...(typeof plastic === "object" ? plastic : {})} />
        ) : null}
        {painterly && modelReady ? (
          <Painterly {...(typeof painterly === "object" ? painterly : {})} />
        ) : null}
        {breathe && modelReady ? (
          <Breathe {...(typeof breathe === "object" ? breathe : {})} />
        ) : null}
        {glow && modelReady ? (
          <Glow
            {...(Array.isArray(glow)
              ? { colors: glow }
              : (glow as { colors: readonly string[] }))}
          />
        ) : null}
        {children}
      </LegoCanvas>
    </div>
  );
}

function ScrollSweep({
  sweep,
  parallax,
  buildIn,
  shift,
  startAzimuth,
  mode,
  pan,
  tour,
  regions,
  drift,
  vortices,
}: {
  sweep: typeof DEFAULT_SWEEP;
  parallax: number;
  buildIn: boolean;
  shift: number;
  startAzimuth: number;
  mode: "orbit" | "pan";
  pan?: { travel?: number; distance?: number; rise?: number };
  tour?: readonly { section: string; region: string }[];
  regions?: Record<string, { focus: [number, number]; distance: number; label?: string }>;
  drift: number;
  vortices?: readonly { focus: [number, number]; radius: number; twist?: number; flow?: number }[];
}) {
  const stage = useLegoStage();
  const [framed, setFramed] = useState(false);
  const baseDistance = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);

  // Mounted only once the model is in the scene, so one frame is enough for the
  // instanced meshes to report their real bounds.
  useEffect(() => {
    if (!stage) return;
    const raf = requestAnimationFrame(() => {
      stage.frameAll(1.5);
      setFramed(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  useEffect(() => {
    if (!stage || !framed) return;

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (buildIn) stage.playBuildIn({ drop: 9, stagger: 4 });
    stage.setViewSmoothing(reduced ? 1 : 0.06);

    // Snapshot the framed distance once; the sweep scales relative to it.
    const box = new THREE.Box3().setFromObject(stage.root);
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    baseDistance.current = stage.camera.position.distanceTo(center);

    // Swirl centres are declared in normalised panel coordinates; the pass needs
    // world positions so it can reproject them as the camera moves.
    if (vortices && vortices.length > 0) {
      stage.setVortices(
        vortices.map((entry) => ({
          position: new THREE.Vector3(
            box.min.x + extent.x * entry.focus[0],
            box.min.y + extent.y * entry.focus[1],
            center.z,
          ),
          radius: extent.x * entry.radius,
          twist: entry.twist,
          flow: entry.flow,
        })),
      );
    }

    /*
     * Camera sway. The scroll-derived view is stored, and a slow drift is added
     * to it every frame — so the two compose instead of fighting: scrolling
     * still moves the camera, and between scrolls it keeps breathing.
     *
     * Three incommensurate frequencies, so the path never visibly repeats.
     */
    let swayStop: (() => void) | undefined;
    const base = { azimuth: 0, elevation: 0, distance: 0, target: center.clone() };
    let haveBase = false;

    const applyWithDrift = (elapsed: number) => {
      if (!haveBase) return;
      const radians = Math.PI / 180;
      const azimuth =
        base.azimuth +
        (Math.sin(elapsed * 0.11) * 0.62 + Math.sin(elapsed * 0.17 + 1.3) * 0.3) *
          drift *
          radians;
      const elevation =
        base.elevation + Math.cos(elapsed * 0.13) * 0.45 * drift * radians;
      const distance = base.distance * (1 + Math.sin(elapsed * 0.07) * 0.006 * drift);
      stage.setView({ azimuth, elevation, distance, target: base.target });
    };

    const apply = () => {
      // Only push the set aside when there is room for a column beside it.
      stage.setFrameShift(window.innerWidth >= 900 ? shift : 0, 0);

      const doc = document.documentElement;
      const range = Math.max(doc.scrollHeight - doc.clientHeight, 1);
      const progress = reduced ? 0 : Math.min(1, Math.max(0, scroll.current / range));

      const azimuth =
        ((startAzimuth +
          sweep.azimuth * progress +
          (reduced ? 0 : pointer.current.x * parallax)) *
          Math.PI) /
        180;
      const [lowElevation, highElevation] = sweep.elevation;
      const elevation =
        (((lowElevation + (highElevation - lowElevation) * progress) +
          (reduced ? 0 : pointer.current.y * parallax * 0.5)) *
          Math.PI) /
        180;

      // A tour wins when the set actually defines the regions it names.
      const stops =
        tour
          ?.map((entry) => ({ ...entry, place: regions?.[entry.region] }))
          .filter((entry): entry is typeof entry & { place: NonNullable<typeof entry.place> } =>
            Boolean(entry.place),
          ) ?? [];

      if (stops.length > 0) {
        const measured = stops.map((stop) => {
          const element = document.getElementById(stop.section);
          // Centre of the section, in document coordinates.
          const top = element
            ? element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35
            : 0;
          return { ...stop, top };
        });

        const here = window.scrollY;
        let from = measured[0];
        let to = measured[0];
        let t = 0;
        for (let index = 0; index < measured.length - 1; index += 1) {
          if (here >= measured[index].top) {
            from = measured[index];
            to = measured[index + 1];
            const span = Math.max(to.top - from.top, 1);
            t = Math.min(1, Math.max(0, (here - from.top) / span));
          }
        }
        if (here < measured[0].top) {
          from = measured[0];
          to = measured[0];
          t = 0;
        }

        // Smoothstep between stops, so arriving at a region settles rather
        // than stopping dead.
        const eased = t * t * (3 - 2 * t);
        const lerp = (a: number, b: number) => a + (b - a) * eased;

        const focusX = lerp(from.place.focus[0], to.place.focus[0]);
        const focusY = lerp(from.place.focus[1], to.place.focus[1]);
        const closeness = lerp(from.place.distance, to.place.distance);

        const focus = new THREE.Vector3(
          box.min.x + extent.x * focusX,
          box.min.y + extent.y * focusY,
          center.z,
        );

        const distance = Math.max(extent.x, extent.y) * closeness;
        if (drift > 0 && !reduced) {
          base.azimuth = azimuth;
          base.elevation = elevation;
          base.distance = distance;
          base.target.copy(focus);
          haveBase = true;
          return;
        }
        stage.setView({ azimuth, elevation, distance, target: focus }, { immediate: reduced });
        return;
      }

      if (mode === "pan") {
        // Inside the frame: hold the camera close and facing, and slide the
        // point it is looking at across the surface as the page scrolls. The
        // subject stays the same distance away, so it never shrinks — it is the
        // view that travels, not the object.
        const travel = pan?.travel ?? 0.6;
        const rise = pan?.rise ?? 0.15;
        const closeness = pan?.distance ?? 0.45;
        const focus = center.clone();
        focus.x += (progress - 0.5) * extent.x * travel;
        focus.y += (progress - 0.5) * extent.y * rise;

        stage.setView(
          {
            azimuth,
            elevation,
            distance: Math.max(extent.x, extent.y) * closeness,
            target: focus,
          },
          { immediate: reduced },
        );
        return;
      }

      const [nearZoom, farZoom] = sweep.zoom;
      const distance = baseDistance.current * (nearZoom + (farZoom - nearZoom) * progress);

      stage.setView({ azimuth, elevation, distance, target: center }, { immediate: reduced });
    };

    const onScroll = () => {
      scroll.current = window.scrollY;
      apply();
    };
    const onPointer = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      apply();
    };

    scroll.current = window.scrollY;
    apply();

    if (drift > 0 && !reduced) {
      let elapsed = 0;
      swayStop = stage.addUpdater((delta) => {
        elapsed += delta;
        applyWithDrift(elapsed);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduced && parallax > 0) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    }
    window.addEventListener("resize", apply);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", apply);
      swayStop?.();
    };
  }, [
    stage,
    framed,
    sweep,
    parallax,
    buildIn,
    shift,
    startAzimuth,
    mode,
    pan,
    tour,
    regions,
    drift,
    vortices,
  ]);

  return null;
}

function Preload({ slugs }: { slugs: readonly (LegoSetSlug | string)[] }) {
  const key = slugs.join(",");

  useEffect(() => {
    // Parsing a packed set is heavy; wait for the browser to be idle so it never
    // competes with the first paint or the build-in animation.
    const run = () => {
      for (const slug of key.split(",")) {
        try {
          const entry = legoSet(slug);
          preloadLDrawModel(entry.url, { fitToStuds: entry.fitToStuds });
        } catch {
          // An unregistered slug is a caller mistake, not worth breaking on.
        }
      }
    };

    const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) {
      const handle = idle(run);
      return () => {
        (globalThis as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
      };
    }
    const timer = setTimeout(run, 2500);
    return () => clearTimeout(timer);
  }, [key]);

  return null;
}

/** Applies the physical-plastic upgrade once the model is in the scene. */
function Plastic({ clearcoat, roughness }: { clearcoat?: number; roughness?: number }) {
  const stage = useLegoStage();

  useEffect(() => {
    if (!stage) return;
    // A frame's grace so the model's materials are actually in the scene.
    const frame = requestAnimationFrame(() => stage.refinePlastic({ clearcoat, roughness }));
    return () => cancelAnimationFrame(frame);
  }, [stage, clearcoat, roughness]);

  return null;
}

/** Flattens the model to graphic toon shading once it is in the scene. */
function Painterly({ steps, saturate }: { steps?: number; saturate?: number }) {
  const stage = useLegoStage();

  useEffect(() => {
    if (!stage) return;
    const frame = requestAnimationFrame(() => stage.applyPainterly({ steps, saturate }));
    return () => cancelAnimationFrame(frame);
  }, [stage, steps, saturate]);

  return null;
}

/** Starts the halo breathing once the model (and so its halos) are in scene. */
function Breathe({ amount, speed }: { amount?: number; speed?: number }) {
  const stage = useLegoStage();

  useEffect(() => {
    if (!stage) return;
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let stop: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      stop = stage.breatheHalos({ amount, speed });
    });
    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, [stage, amount, speed]);

  return null;
}
