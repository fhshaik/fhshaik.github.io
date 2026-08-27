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
  /**
   * Studs along the top edge. 2 by default — a card is much squarer than a
   * button, so it reads as a short brick rather than a long one. 0 removes them.
   */
  studs?: number;
  href?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * A card, treated as a brick seen from the side: flat face, hairline edge, a
 * couple of studs on the top, and a coloured stripe along the top edge that
 * draws out to full width on hover.
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
  studs = 2,
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
      {studs > 0 ? (
        <span className="lego-plate__studs" aria-hidden="true">
          {Array.from({ length: studs }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : null}
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
