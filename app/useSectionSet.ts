"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section is on screen and returns its set slug.
 *
 * Used to change the backdrop as the page scrolls: each section names the set it
 * wants behind it. Picks the section nearest the top of the viewport rather than
 * the first intersecting one, so a short section between two tall ones still
 * gets its turn.
 */
export function useSectionSet(map: Record<string, string>, fallback: string): string {
  const [set, setSet] = useState(fallback);
  const key = Object.keys(map).join(",");

  useEffect(() => {
    const ids = key.split(",").filter(Boolean);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, Math.abs(entry.boundingClientRect.top));
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) return;
        const nearest = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
        const next = map[nearest];
        if (next) setSet(next);
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
    // `map` is keyed by the same ids as `key`; re-running on identity churn
    // would tear the observer down on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return set;
}
