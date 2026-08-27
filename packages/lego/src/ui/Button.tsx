"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { legoColorValue, type UiColor } from "./primitives";

type Variant = "default" | "accent" | "quiet";

interface Common {
  children?: ReactNode;
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
 * Flat, hairline-edged, uppercase and tracked — with two 3px studs on the top
 * edge as the only literal LEGO detail. The brick feeling comes from the press:
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
    className,
    style,
    href,
    ...rest
  } = props as Base & Record<string, unknown>;

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
      {children}
    </button>
  );
}
