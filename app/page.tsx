import type { Metadata } from "next";
import LDrawPortfolio from "./components/LDrawPortfolio";

export const metadata: Metadata = {
  title: "Faadil Shaik — Physics, AI & Software",
  description: "An interactive LEGO garden portfolio exploring physics, machine learning, and software engineering.",
};

export default function Home() {
  return <LDrawPortfolio />;
}
