"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { GridPosition } from "../core/brick";
import type { PartKind, PartSpec } from "../core/geometry";
import type { ColorInput } from "../core/materials";
import { useLegoStage } from "./context";

export interface BrickProps {
  /** Grid position `[x, level, z]` — studs, plates, studs. */
  at?: GridPosition;
  color?: ColorInput;
  /** Footprint along x, in studs. */
  width?: number;
  /** Footprint along z, in studs. */
  depth?: number;
  /** Height in plates. Defaults per part kind. */
  height?: number;
  studs?: boolean;
  /** Degrees about the vertical axis. */
  rotation?: number;
  anchor?: "corner" | "center";
  interactive?: boolean;
  visible?: boolean;
  /**
   * Rendered fully transparent but still clickable — see {@link Hotspot}.
   */
  ghost?: boolean;
  /**
   * Handed back on pick/hover events. Updated without rebuilding the scene, so
   * an inline object literal here is safe.
   */
  data?: unknown;
}

interface PartProps extends BrickProps {
  kind: PartKind;
}

/**
 * Registers one part with the enclosing stage for as long as it is mounted.
 * Renders no DOM — the stage owns the actual geometry.
 */
export function Part({
  kind,
  at = [0, 0, 0],
  color = "light-bluish-gray",
  width = 2,
  depth = 2,
  height,
  studs,
  rotation,
  anchor,
  interactive,
  visible,
  ghost,
  data,
}: PartProps) {
  const stage = useLegoStage();
  const id = useId();

  const part = useMemo<PartSpec>(
    () => ({ kind, width, depth, heightPlates: height, studs }),
    [kind, width, depth, height, studs],
  );

  const [x, level, z] = at;

  // `data` is intentionally not a dependency of the registration effect: it is
  // pushed separately below, so an inline object literal does not rebuild the
  // scene on every render. This sync is declared first so the registration
  // effect always reads the current value.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!stage) return;
    stage.set({
      id,
      part,
      color,
      position: [x, level, z],
      rotation,
      anchor,
      interactive,
      visible,
      ghost,
      data: dataRef.current,
    });
    return () => stage.remove(id);
  }, [stage, id, part, color, x, level, z, rotation, anchor, interactive, visible, ghost]);

  useEffect(() => {
    stage?.setData(id, data);
  }, [stage, id, data]);

  return null;
}

const part = (kind: PartKind, defaults: Partial<BrickProps> = {}) => {
  const Component = (props: BrickProps) => <Part kind={kind} {...defaults} {...props} />;
  Component.displayName = `Lego${kind[0].toUpperCase()}${kind.slice(1)}`;
  return Component;
};

/** A standard brick: three plates tall, studs on top. */
export const Brick = part("brick");
/** A plate: one third the height of a brick. */
export const Plate = part("plate");
/** A tile: plate height, smooth top. */
export const Tile = part("tile");
/** A 45-degree slope descending along +x (rotate to face elsewhere). */
export const Slope = part("slope");
/** A round brick. `width` is its diameter in studs. */
export const RoundBrick = part("round", { width: 1, depth: 1 });
/** A cone. */
export const Cone = part("cone", { width: 1, depth: 1 });
/** A thin studded baseplate — the ground a build sits on. */
export const Baseplate = part("baseplate", {
  width: 16,
  depth: 16,
  color: "sand-green",
  interactive: false,
});

export interface HotspotProps {
  at: GridPosition;
  /** Size of the invisible pick volume, in studs / plates / studs. */
  size?: [width: number, heightPlates: number, depth: number];
  data?: unknown;
  anchor?: "corner" | "center";
}

/**
 * An invisible, clickable volume. Use it to make a region of a loaded LDraw
 * model interactive — the model itself is one merged mesh, so it cannot carry
 * per-region pick data on its own.
 */
export function Hotspot({ at, size = [2, 3, 2], data, anchor = "center" }: HotspotProps) {
  return (
    <Part
      kind="tile"
      at={at}
      width={size[0]}
      depth={size[2]}
      height={size[1]}
      studs={false}
      anchor={anchor}
      color="trans-clear"
      data={data}
      ghost
      interactive
    />
  );
}
