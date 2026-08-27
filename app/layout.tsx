import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { legoTokensCss } from "@fhshaik/lego/tokens";
import "@fhshaik/lego/lego.css";
import "./globals.css";

// One geometric sans for display at light weights, a neutral sans for body.
// The character comes from extreme size contrast, not from a decorative face.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Faadil Shaik — Physics, AI & Software",
  description:
    "Physics, machine learning, and software. A portfolio rendered from authored LEGO sets.",
};

// Server-rendered so the tokens are present on first paint — no flash, and one
// source of truth shared with the three.js side.
const tokens = legoTokensCss({ theme: "studio" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokens }} />
      </head>
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
