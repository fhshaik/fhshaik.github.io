"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LegoStage, type LegoPickEvent, type LegoStageOptions } from "../core/stage";
import { LEGO_THEMES, type LegoThemeName } from "../tokens/theme";
import { LegoStageContext, useLegoStage } from "./context";

export interface LegoCanvasProps extends Omit<LegoStageOptions, "theme"> {
  theme?: LegoThemeName;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Fired on pointer-down. `null` means the click missed every brick. */
  onPick?: (event: LegoPickEvent | null) => void;
  onHover?: (event: LegoPickEvent | null) => void;
  /** Auto-frame the camera once the first bricks land. Defaults to true. */
  autoFrame?: boolean;
  /**
   * Accessible description of the build. Rendered as visually-hidden text so
   * the scene is not a blank hole for screen readers.
   */
  label?: string;
  /** Shown while the stage boots or a model loads. */
  fallback?: ReactNode;
}

/**
 * Mounts a {@link LegoStage} and shares it with descendant brick components.
 *
 * ```tsx
 * <LegoCanvas theme="studio" label="A red 2x4 brick on a green baseplate">
 *   <Baseplate width={16} depth={16} color="sand-green" />
 *   <Brick width={2} depth={4} color="red" at={[6, 0, 6]} />
 * </LegoCanvas>
 * ```
 */
export function LegoCanvas({
  theme = "studio",
  children,
  className,
  style,
  onPick,
  onHover,
  autoFrame = true,
  label,
  fallback,
  ...stageOptions
}: LegoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<LegoStage | null>(null);

  // Snapshot the options so a new object literal each render does not tear the
  // stage down and rebuild it. Synced in an effect declared before the one that
  // builds the stage, so it is current by the time a rebuild reads it.
  const optionsRef = useRef(stageOptions);
  useEffect(() => {
    optionsRef.current = stageOptions;
  });

  const themeValue = LEGO_THEMES[theme];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = new LegoStage(container, {
      ...optionsRef.current,
      theme: themeValue,
    });
    setStage(instance);

    return () => {
      setStage(null);
      instance.dispose();
    };
  }, [themeValue]);

  useEffect(() => {
    if (!stage || !onPick) return;
    return stage.onPick(onPick);
  }, [stage, onPick]);

  useEffect(() => {
    if (!stage || !onHover) return;
    return stage.onHover(onHover);
  }, [stage, onHover]);

  useEffect(() => {
    if (!stage || !autoFrame) return;
    // Frame after children have registered their bricks.
    const id = requestAnimationFrame(() => stage.frameAll());
    return () => cancelAnimationFrame(id);
  }, [stage, autoFrame]);

  const mergedStyle = useMemo<CSSProperties>(
    () => ({ position: "relative", width: "100%", height: "100%", ...style }),
    [style],
  );

  return (
    <div className={className} style={mergedStyle} ref={containerRef}>
      <LegoStageContext.Provider value={stage}>
        {stage ? children : null}
      </LegoStageContext.Provider>
      {label ? (
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      ) : null}
      {!stage && fallback ? fallback : null}
    </div>
  );
}

/** Re-frames the camera whenever `deps` change. */
export function useFrameAll(deps: readonly unknown[] = []): void {
  const stage = useLegoStage();
  useEffect(() => {
    if (!stage) return;
    const id = requestAnimationFrame(() => stage.frameAll());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, ...deps]);
}
