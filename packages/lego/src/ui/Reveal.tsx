"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

export interface RevealProps {
  children?: ReactNode;
  /** Element to render. Defaults to `div`. */
  as?: ElementType;
  /** Seconds to hold before animating in. Use to stagger siblings. */
  delay?: number;
  /** How far the element rises, in px. */
  distance?: number;
  /** Replay every time it enters the viewport. Defaults to false. */
  repeat?: boolean;
  className?: string;
  style?: CSSProperties;
}

let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, (visible: boolean) => void>();

function sharedObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        callbacks.get(entry.target)?.(entry.isIntersecting);
      }
    },
    // Fire a little before the element is fully on screen, so the motion has
    // finished by the time the reader's eye reaches it.
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
  );
  return observer;
}

/**
 * Reveals its children as they scroll into view: a short rise out of a blur.
 *
 * Uses one shared IntersectionObserver for every instance on the page and
 * animates only `opacity`/`transform`/`filter`, so it stays off the layout
 * path. `prefers-reduced-motion` is handled in CSS — the stylesheet renders
 * these visible unconditionally — rather than in JS, so there is no state
 * update on mount and no hydration mismatch.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  distance = 26,
  repeat = false,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const instance = sharedObserver();
    callbacks.set(element, (isVisible) => {
      if (isVisible) {
        setVisible(true);
        if (!repeat) instance.unobserve(element);
      } else if (repeat) {
        setVisible(false);
      }
    });
    instance.observe(element);

    return () => {
      instance.unobserve(element);
      callbacks.delete(element);
    };
  }, [repeat]);

  return (
    <Tag
      ref={ref}
      className={["lego-reveal", visible ? "is-visible" : "", className].filter(Boolean).join(" ")}
      style={
        {
          "--lego-reveal-delay": `${delay}s`,
          "--lego-reveal-distance": `${distance}px`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
