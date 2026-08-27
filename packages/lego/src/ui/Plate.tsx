"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { legoColorValue, StudMark, type UiColor } from "./primitives";

export interface PlateProps {
  /** Colour of the edge stripe — a brick seen from the side. */
  accent?: UiColor;
  eyebrow?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  /** Draws the edge stripe full width, for a current/selected item. */
  selected?: boolean;
  href?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * A card, treated as a thin plate: flat surface, hairline edge, and a coloured
 * stripe along the top that draws out to full width on hover. No studs — the
 * stripe carries the colour, so a grid of these stays calm.
 *
 * Renders `<a>` with `href`, `<button>` with `onClick`, `<div>` otherwise, so an
 * interactive card is keyboard-reachable without a synthetic tabIndex.
 */
export function Plate({
  accent = "red",
  eyebrow,
  title,
  meta,
  children,
  selected,
  href,
  external,
  onClick,
  className,
  style,
  ...rest
}: PlateProps) {
  const interactive = Boolean(href || onClick);
  const classes = ["lego-plate", className].filter(Boolean).join(" ");
  const styles = {
    "--lego-plate-accent": legoColorValue(accent),
    ...style,
  } as CSSProperties;

  const content = (
    <>
      {eyebrow ? (
        <span className="lego-plate__eyebrow">
          <StudMark color={accent} size={6} />
          {eyebrow}
        </span>
      ) : null}
      {title ? <span className="lego-plate__title">{title}</span> : null}
      {meta ? <span className="lego-plate__meta">{meta}</span> : null}
      {children}
    </>
  );

  const shared = {
    className: classes,
    style: styles,
    "data-interactive": interactive ? "true" : undefined,
    "data-selected": selected ? "true" : undefined,
    ...rest,
  };

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        {...shared}
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...shared}>
        {content}
      </button>
    );
  }

  return <div {...shared}>{content}</div>;
}
