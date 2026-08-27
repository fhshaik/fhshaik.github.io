"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { legoColorValue, type UiColor } from "./primitives";

type Variant = "default" | "accent" | "quiet";

interface Common {
  children?: ReactNode;
  /**
   * Studs along the top edge, spread across the full width — so the control
   * reads as a brick seen from its long side. 3 by default; 0 removes them.
   */
  studs?: number;
  /** Override the accent used for the hover underline / fill. */
  accent?: UiColor;
  variant?: Variant;
  /** Renders in the held-down state, e.g. an active filter. */
  pressed?: boolean;
  className?: string;
  style?: CSSProperties;
}

type Base = Common & { href?: string };

export type LegoButtonProps = Base &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Base | "color">;

export type LegoLinkProps = Base & { href: string } &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Base | "color">;

/**
 * The primary control.
 *
 * A brick seen from its long side: flat face, hairline edge, and three studs
 * spaced evenly across the top the way a 2x3 carries them. The rest of the brick
 * feeling comes from the press:
 * it drops 2px in 80ms and springs back over 500ms, the way a brick seats onto
 * a stud.
 *
 * Renders an `<a>` when given `href`, a `<button>` otherwise.
 */
export function Button(props: LegoButtonProps | LegoLinkProps) {
  // Cast to the intersection before destructuring: a rest element cannot be
  // taken from a union type.
  const {
    children,
    accent,
    variant = "default",
    pressed,
    studs = 3,
    className,
    style,
    href,
    ...rest
  } = props as Base & Record<string, unknown>;

  const cap =
    studs > 0 ? (
      <span className="lego-button__studs" aria-hidden="true">
        {Array.from({ length: studs }, (_, index) => (
          <i key={index} />
        ))}
      </span>
    ) : null;

  const shared = {
    className: ["lego-button", className].filter(Boolean).join(" "),
    "data-variant": variant === "default" ? undefined : variant,
    style: {
      ...(accent ? { "--lego-button-accent": legoColorValue(accent) } : {}),
      ...style,
    } as CSSProperties,
  };

  if (typeof href === "string") {
    return (
      <a href={href} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} {...shared}>
        {cap}
        {children}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? "button"}
      aria-pressed={pressed ?? buttonProps["aria-pressed"]}
      {...buttonProps}
      {...shared}
    >
      {cap}
      {children}
    </button>
  );
}
