"use client";

import { createContext, useContext } from "react";
import type { LegoStage } from "../core/stage";

export const LegoStageContext = createContext<LegoStage | null>(null);

/**
 * The stage for the nearest `<LegoCanvas>`.
 *
 * `<LegoCanvas>` only renders its children once the stage exists, so inside a
 * brick component this is always non-null. Called outside a canvas it returns
 * `null` rather than throwing, so optional integrations stay simple.
 */
export function useLegoStage(): LegoStage | null {
  return useContext(LegoStageContext);
}
