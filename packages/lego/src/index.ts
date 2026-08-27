/**
 * @fhshaik/lego — LEGO for the web.
 *
 * - **3D** (`@fhshaik/lego/react`, `/core`) — a renderer for **authored official
 *   LEGO sets** from the LDraw Official Model Repository, plus the individual
 *   parts (brick, plate, tile, slope, baseplate) generated to real LDraw
 *   measurements. It renders sets; it does not design builds.
 * - **2D** (`@fhshaik/lego/ui`) — the interface: flat hairline surfaces, one
 *   accent, a stud used as punctuation, and brick-click press physics.
 *
 * Both halves read one token set from `@fhshaik/lego/tokens`.
 *
 * ```tsx
 * import { LegoBackdrop } from "@fhshaik/lego/react";
 * import { Button, Plate } from "@fhshaik/lego/ui";
 * import "@fhshaik/lego/lego.css";
 * ```
 */

export * from "./tokens";
export * from "./core";
export * from "./react";
// The 2D card is `Plate` in `@fhshaik/lego/ui`; here it is `PlateCard`, because
// `Plate` at the root is the three.js part.
export {
  Button,
  Plate as PlateCard,
  StudField,
  Rail,
  Divider,
  Swatch,
  StudMark,
  Reveal,
  Lines,
  legoColorValue,
  type LegoButtonProps,
  type LegoLinkProps,
  type PlateProps,
  type StudFieldProps,
  type RailItem,
  type RailProps,
  type DividerProps,
  type SwatchProps,
  type StudMarkProps,
  type RevealProps,
  type LinesProps,
  type UiColor,
} from "./ui";
