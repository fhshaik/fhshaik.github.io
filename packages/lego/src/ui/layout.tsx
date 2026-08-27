"use client";

import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { legoColorValue, StudMark, type UiColor } from "./primitives";

export interface StudFieldProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** Fade the stud grid out at the edges. Defaults to true. */
  fade?: boolean;
  children?: ReactNode;
}

/**
 * The LEGO surface as a background: a tiled stud grid drawn with two gradient
 * layers, scaled by `--lego-pitch`. Kept at very low contrast and masked at the
 * edges, so it reads as texture rather than wallpaper.
 */
export function StudField({
  as: Tag = "div",
  fade = true,
  children,
  className,
  ...rest
}: StudFieldProps) {
  return (
    <Tag
      className={["lego-studfield", className].filter(Boolean).join(" ")}
      data-fade={fade ? "true" : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface RailItem {
  id: string;
  label: ReactNode;
  accent?: UiColor;
}

export interface RailProps {
  items: readonly RailItem[];
  active?: string;
  onSelect?: (id: string) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Vertical navigation. The active item slides out and gains a stud, the way you
 * pull one brick proud of a wall.
 */
export function Rail({ items, active, onSelect, label = "Sections", className, style }: RailProps) {
  return (
    <ul
      className={["lego-rail", className].filter(Boolean).join(" ")}
      aria-label={label}
      style={style}
    >
      {items.map((item) => (
        <li className="lego-rail__item" key={item.id} data-active={item.id === active ? "true" : undefined}>
          <button
            type="button"
            className="lego-rail__button"
            aria-current={item.id === active ? "true" : undefined}
            onClick={() => onSelect?.(item.id)}
          >
            <StudMark color={item.accent} size={6} />
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export interface DividerProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A section label with a hairline running off to the right. */
export function Divider({ children, className, style }: DividerProps) {
  return (
    <div className={["lego-divider", className].filter(Boolean).join(" ")} style={style}>
      {children}
      <span aria-hidden="true" style={{ display: "contents" }} />
    </div>
  );
}

export interface SwatchProps {
  color: UiColor;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A palette chip. Flat, 14px, hairline inset — a legend entry, not a button. */
export function Swatch({ color, label, className, style }: SwatchProps) {
  return (
    <span className={["lego-swatch", className].filter(Boolean).join(" ")} style={style}>
      <span
        className="lego-swatch__chip"
        style={{ "--lego-swatch-color": legoColorValue(color) } as CSSProperties}
      />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
