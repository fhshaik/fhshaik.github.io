"use client";

export { LegoCanvas, useFrameAll, type LegoCanvasProps } from "./LegoCanvas";
export { LegoStageContext, useLegoStage } from "./context";
// Re-exported so consumers can type an `onPick` handler without also
// importing from `@fhshaik/lego/core`.
export type { LegoPickEvent, LegoStageOptions, BuildInOptions } from "../core/stage";
export {
  Part,
  Brick,
  Plate,
  Tile,
  Slope,
  RoundBrick,
  Cone,
  Baseplate,
  Hotspot,
  type BrickProps,
  type HotspotProps,
} from "./bricks";
export { LDrawModel, type LDrawModelProps, type LDrawStatus } from "./LDrawModel";
export { Petals, type PetalsProps } from "./Petals";
export { LegoBackdrop, type LegoBackdropProps } from "./presets/LegoBackdrop";
