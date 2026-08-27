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
import { useLegoStage } from "../context";

export interface LegoBackdropProps {
  /** Official set to place in the world. */
  set?: LegoSetSlug | string;
  theme?: LegoThemeName;
  lighting?: "cosy" | "studio";
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
  /**
   * Other sets to parse in the background, so switching to one is instant.
   * Warmed after the current set is on screen, on an idle callback.
   */
  preload?: readonly (LegoSetSlug | string)[];
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
  theme = "studio",
  lighting = "cosy",
  baseplate = 24,
  baseplateColor = "sand-green",
  sweep,
  parallax = 5,
  buildIn = true,
  petals = false,
  fog = true,
  preload,
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
  const plateSize = baseplate === 0 ? 0 : Math.max(baseplate, Math.round(resolved.fitToStuds * 1.35));

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
        theme={theme}
        lighting={lighting}
        orbit={false}
        autoFrame
        fog={fog}
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
          at={[0, 0.5, 0]}
          onStatusChange={(status) => setReadyUrl(status === "ready" ? resolved.url : null)}
        />

        {preload && preload.length > 0 ? <Preload slugs={preload} /> : null}

        {modelReady ? (
          <ScrollSweep
            sweep={{ ...DEFAULT_SWEEP, ...sweep }}
            parallax={parallax}
            buildIn={buildIn}
            shift={shift}
          />
        ) : null}
        {petals ? <Petals {...(typeof petals === "object" ? petals : {})} /> : null}
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
}: {
  sweep: typeof DEFAULT_SWEEP;
  parallax: number;
  buildIn: boolean;
  shift: number;
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
    baseDistance.current = stage.camera.position.distanceTo(center);

    const apply = () => {
      // Only push the set aside when there is room for a column beside it.
      stage.setFrameShift(window.innerWidth >= 900 ? shift : 0, 0);

      const doc = document.documentElement;
      const range = Math.max(doc.scrollHeight - doc.clientHeight, 1);
      const progress = reduced ? 0 : Math.min(1, Math.max(0, scroll.current / range));

      const azimuth =
        ((sweep.azimuth * progress + (reduced ? 0 : pointer.current.x * parallax)) * Math.PI) / 180;
      const [lowElevation, highElevation] = sweep.elevation;
      const elevation =
        (((lowElevation + (highElevation - lowElevation) * progress) +
          (reduced ? 0 : pointer.current.y * parallax * 0.5)) *
          Math.PI) /
        180;
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

    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduced && parallax > 0) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    }
    window.addEventListener("resize", apply);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", apply);
    };
  }, [stage, framed, sweep, parallax, buildIn, shift]);

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
