import type { Metadata } from "next";
import LegoPlayground from "./LegoPlayground";

export const metadata: Metadata = {
  title: "LEGO library — Faadil Shaik",
  description:
    "Every component in the LEGO building-block library: procedural three.js bricks, a seeded city generator, and the matching 2D UI kit.",
};

export default function LegoLibraryPage() {
  return <LegoPlayground />;
}
