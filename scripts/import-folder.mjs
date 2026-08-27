/**
 * Batch-imports every LEGO model in a folder.
 *
 * Point it at ~/Downloads after grabbing `.mpd` / `.ldr` / `.io` files from the
 * LDraw forums (or Studio, or Rebrickable), and it packs each one and prints a
 * ready-to-paste entry for `packages/lego/src/core/sets.ts`.
 *
 * Usage:
 *   node scripts/import-folder.mjs ~/Downloads
 *   node scripts/import-folder.mjs ~/Downloads --match 21333 --allow-unlicensed
 *
 * Already-imported slugs are skipped, so it is safe to re-run.
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith("--"));
const flagValue = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : null;
};

const folder = (positional[0] ?? "~/Downloads").replace(/^~/, os.homedir());
const match = flagValue("match");
const allowUnlicensed = args.includes("--allow-unlicensed");
const force = args.includes("--force");

if (!existsSync(folder)) {
  console.error(`No such folder: ${folder}`);
  process.exit(1);
}

const MODEL = /\.(mpd|ldr|io)$/i;

/** `21333 - The Starry Night.mpd` -> `starry-night` */
function slugFor(filename) {
  const base = path.basename(filename).replace(MODEL, "");
  const withoutNumber = base.replace(/^\s*\d{3,6}(-\d+)?\s*[-–]?\s*/, "");
  return (withoutNumber || base)
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const entries = (await readdir(folder))
  .filter((name) => MODEL.test(name))
  .filter((name) => !match || name.toLowerCase().includes(match.toLowerCase()))
  .sort();

if (entries.length === 0) {
  console.error(
    `No .mpd/.ldr/.io files in ${folder}${match ? ` matching "${match}"` : ""}.`,
  );
  process.exit(1);
}

console.log(`Found ${entries.length} model file(s) in ${folder}\n`);

const imported = [];
const failed = [];

for (const name of entries) {
  const slug = slugFor(name);
  const packed = path.join("public", "ldraw", `${slug}-packed.mpd`);

  if (existsSync(packed) && !force) {
    console.log(`skip   ${name} -> ${slug} (already imported; --force to redo)`);
    continue;
  }

  console.log(`import ${name} -> ${slug}`);
  try {
    execFileSync(
      "node",
      [
        "scripts/import-ldraw-set.mjs",
        path.join(folder, name),
        "--slug",
        slug,
        ...(allowUnlicensed ? ["--allow-unlicensed"] : []),
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    imported.push(slug);
  } catch {
    failed.push(name);
    console.error(`  failed: ${name}`);
  }
}

// --- report -----------------------------------------------------------------

console.log(`\n${"=".repeat(72)}\nRegistry entries for packages/lego/src/core/sets.ts\n${"=".repeat(72)}\n`);

for (const slug of imported) {
  const report = JSON.parse(
    await readFile(path.join("public", "ldraw", `${slug}-report.json`), "utf8"),
  );

  // True footprint in studs, so different sets keep their real relative sizes.
  let footprint = 20;
  try {
    const out = execFileSync(
      "node",
      ["scripts/validate-ldraw-model.mjs", path.join("public", "ldraw", `${slug}-packed.mpd`)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const bounds = JSON.parse(out.trim().split("\n").pop()).bounds;
    footprint = Math.max(1, Math.round(Math.max(bounds[0], bounds[2]) / 20));
  } catch {
    // Framing is a display choice; a fallback is fine.
  }

  const title = report.title ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  console.log(`  "${slug}": {
    slug: "${slug}",
    setNumber: "${report.set}",
    title: "${title}",
    author: "${report.author}",
    license: "${(report.license ?? "unstated").replace(/ : see.*$/, "")}",
    source: "${report.source}",
    url: "/ldraw/${slug}-packed.mpd",
    originalUrl: "/ldraw/${slug}.mpd",
    placedParts: ${report.placedParts},
    fitToStuds: ${footprint},
    note: "TODO",
  },`);
}

if (failed.length > 0) {
  console.log(`\nFailed (${failed.length}): ${failed.join(", ")}`);
  console.log("If a model is not marked redistributable, re-run with --allow-unlicensed.");
}
console.log(`\nImported ${imported.length} set(s).`);
