"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { loadLDrawModel, type LDrawModelOptions } from "../core/ldraw";
import { useLegoStage } from "./context";

export type LDrawStatus = "loading" | "ready" | "error";

export interface LDrawModelProps extends LDrawModelOptions {
  /** URL of an `.ldr`, `.mpd`, or `.dat` file. */
  src: string;
  /** Grid position `[x, level, z]` for the model's base. */
  at?: [number, number, number];
  /** Degrees about the vertical axis. */
  rotation?: number;
  onStatusChange?: (status: LDrawStatus, error?: Error) => void;
  /** Rendered while loading or on failure. */
  children?: (status: LDrawStatus, error?: Error) => ReactNode;
}

/**
 * Loads an official LDraw model into the enclosing canvas, normalised onto the
 * same grid as procedural bricks — so a real set and hand-built bricks can
 * share one scene.
 */
export function LDrawModel({
  src,
  at = [0, 0, 0],
  rotation = 0,
  onStatusChange,
  children,
  fitToStuds,
  ground,
  merge,
  shadows,
  edges,
  partsPath,
  onProgress,
}: LDrawModelProps) {
  const stage = useLegoStage();
  // The load result is recorded against the src it belongs to, so a changed
  // `src` reads as "loading" by derivation rather than by resetting state from
  // inside the effect.
  const [result, setResult] = useState<{
    src: string;
    status: LDrawStatus;
    error?: Error;
  }>({ src, status: "loading" });

  const status: LDrawStatus = result.src === src ? result.status : "loading";
  const error = result.src === src ? result.error : undefined;
  // A three.js Group is a mutable scene-graph node, not React state — keeping
  // it in a ref lets the transform effect move it in place. `revision` is what
  // tells that effect a new model has landed.
  const modelRef = useRef<THREE.Group | null>(null);
  const [revision, setRevision] = useState(0);

  const [x, level, z] = at;

  useEffect(() => {
    if (!stage) return;
    const controller = new AbortController();
    let mounted = true;
    let loaded: THREE.Group | undefined;

    onStatusChange?.("loading");

    loadLDrawModel(src, {
      fitToStuds,
      ground,
      merge,
      shadows,
      edges,
      partsPath,
      onProgress,
      signal: controller.signal,
    })
      .then((group) => {
        if (!mounted) return;
        loaded = group;
        stage.addObject(group);
        modelRef.current = group;
        setRevision((value) => value + 1);
        setResult({ src, status: "ready" });
        onStatusChange?.("ready");
      })
      .catch((cause: unknown) => {
        if (!mounted || controller.signal.aborted) return;
        const wrapped = cause instanceof Error ? cause : new Error(String(cause));
        setResult({ src, status: "error", error: wrapped });
        onStatusChange?.("error", wrapped);
      });

    return () => {
      mounted = false;
      controller.abort();
      modelRef.current = null;
      if (loaded) stage.removeObject(loaded);
    };
    // `onStatusChange` and `onProgress` are deliberately excluded: inline
    // callbacks would otherwise reload the model on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, src, fitToStuds, ground, merge, shadows, edges, partsPath]);

  // Position updates are cheap; keep them out of the load effect so moving a
  // model does not re-fetch and re-parse it.
  useEffect(() => {
    const model = modelRef.current;
    if (!stage || !model) return;
    model.position.set(x, level, z);
    model.rotation.y = (rotation * Math.PI) / 180;
    model.updateMatrixWorld(true);
    // Deliberately no frameAll() here: framing belongs to whatever owns the
    // camera. Re-framing on every position change fights a scroll-driven sweep.
    stage.requestRender();
  }, [stage, revision, x, level, z, rotation]);

  return <>{children?.(status, error)}</>;
}
