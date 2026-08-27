"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

export interface LinesProps {
  /** Each string is one line. Words rise independently, clipped per line. */
  children: string | readonly string[];
  as?: ElementType;
  /** Seconds before the first word moves. */
  delay?: number;
  /** Seconds between consecutive words. */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A headline whose words rise out of their own line box.
 *
 * Each line clips its overflow, so the words appear from nothing rather than
 * fading in — the effect reads as typesetting rather than as an animation, which
 * is what keeps a large display headline from looking templated. Words are real
 * text in the DOM, so it stays selectable and legible to screen readers.
 */
export function Lines({
  children,
  as: Tag = "span",
  delay = 0,
  stagger = 0.055,
  className,
  style,
}: LinesProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const lines = typeof children === "string" ? [children] : children;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Each line's word index continues from the previous line so the stagger runs
  // continuously down the headline. Derived with a reduce rather than a mutable
  // counter, since reassigning during render is not safe under the React
  // compiler.
  const split = lines.reduce<Array<{ words: string[]; start: number }>>(
    (accumulated, line) => {
      const previous = accumulated[accumulated.length - 1];
      return [
        ...accumulated,
        {
          words: line.split(" "),
          start: previous ? previous.start + previous.words.length : 0,
        },
      ];
    },
    [],
  );

  return (
    <Tag
      ref={ref}
      className={["lego-lines", visible ? "is-visible" : "", className].filter(Boolean).join(" ")}
      style={style}
    >
      {split.map(({ words, start }, index) => (
        <span className="lego-lines__line" key={index}>
          {words.map((word, position) => (
            <span
              className="lego-lines__word"
              key={position}
              style={
                {
                  "--lego-word-delay": `${delay + (start + position) * stagger}s`,
                } as CSSProperties
              }
            >
              {position < words.length - 1 ? `${word} ` : word}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
