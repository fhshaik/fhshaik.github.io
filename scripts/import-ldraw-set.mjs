/**
 * Imports an official LEGO set from the LDraw Official Model Repository and
 * packs it into a single self-contained `.mpd` the site can load with no extra
 * requests.
 *
 * Usage:
 *   node scripts/import-ldraw-set.mjs <omrSetId|mpdUrl> [--slug my-name] [--variant 1]
 *
 * Examples:
 *   node scripts/import-ldraw-set.mjs 1383                    # Bonsai (10281)
 *   node scripts/import-ldraw-set.mjs 658 --slug pizza-to-go
 *
 * Builds are authored by LDraw contributors, not generated here. The script
 * records the author and licence of whatever it imports and refuses a model
 * that does not carry a redistributable licence.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/import-ldraw-set.mjs <omrSetId|mpdUrl> [--slug name] [--variant n]");
  process.exit(1);
}

const target = args[0];
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const variant = Number(flag("variant", "0"));

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "public", "ldraw");
const officialBase = "https://library.ldraw.org/library/official";
const mirrorBase =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw";

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`);
  return response.text();
}

/** Resolves an OMR set id to the authored `.mpd` URL and the set's title. */
async function resolveModelUrl(input) {
  if (/^https?:\/\//.test(input)) return { modelUrl: input, title: null };
  const page = await fetchText(`https://library.ldraw.org/omr/sets/${input}`);
  const links = [...page.matchAll(/href="(https:\/\/library\.ldraw\.org\/library\/omr\/[^"]+\.mpd)"/g)]
    .map((match) => match[1]);
  const unique = [...new Set(links)];
  if (unique.length === 0) throw new Error(`No .mpd download found on OMR set page ${input}`);
  const title = page.match(/<title>LDraw\.org Official Model Repository - ([^<\n]*)/)?.[1]?.trim() ?? null;
  if (variant >= unique.length) {
    throw new Error(
      `--variant ${variant} out of range; this set has ${unique.length}: ${unique.map((u) => path.basename(u)).join(", ")}`,
    );
  }
  // Prefer a named variant over the bare `<set>-1.mpd` when one exists.
  const ordered = [...unique].sort((a, b) => b.length - a.length);
  return { modelUrl: ordered[variant], title };
}

const { modelUrl, title } = await resolveModelUrl(target);
const setNumber = path.basename(modelUrl).match(/^(\d+)-\d+/)?.[1] ?? "set";
const slug = flag(
  "slug",
  path
    .basename(modelUrl, ".mpd")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
);

const cacheRoot = path.join(projectRoot, ".cache-ldraw", slug);
const modelCache = path.join(cacheRoot, path.basename(modelUrl));
const colorCache = path.join(projectRoot, ".cache-ldraw", "LDConfig.ldr");

await mkdir(cacheRoot, { recursive: true });
await mkdir(outputRoot, { recursive: true });
console.log(`importing ${modelUrl}`);

const source = existsSync(modelCache)
  ? await readFile(modelCache, "utf8")
  : await fetchText(modelUrl);
if (!existsSync(modelCache)) await writeFile(modelCache, source);

const author = source.match(/^0 Author:\s*(.+)$/m)?.[1]?.trim() ?? "Unknown";
const license = source.match(/^0 !LICENSE\s*(.+)$/m)?.[1]?.trim() ?? "";
if (!/redistributable/i.test(license)) {
  throw new Error(`Model is not marked redistributable (licence: "${license || "none"}")`);
}

const sourceLines = source.replaceAll("\\", "/").split(/\r?\n/).map((line) => {
  if (line.startsWith("0 FILE s/")) return line.replace("0 FILE s/", "0 FILE parts/s/");
  if (line.startsWith("0 FILE 48/")) return line.replace("0 FILE 48/", "0 FILE p/48/");
  return line;
});
const normalizedSource = sourceLines.join("\n");

const sections = new Map();
let currentName = null;
let currentLines = [];
for (const line of sourceLines) {
  if (line.startsWith("0 FILE ")) {
    if (currentName) sections.set(currentName.toLowerCase(), currentLines);
    currentName = line.slice(7).trim();
    currentLines = [];
  } else if (currentName) {
    currentLines.push(line);
  }
}
if (currentName) sections.set(currentName.toLowerCase(), currentLines);

const rootName = sourceLines.find((line) => line.startsWith("0 FILE "))?.slice(7).trim().toLowerCase();
if (!rootName) throw new Error("Model has no root FILE section");

const references = (lines) =>
  lines
    .filter((line) => line.trimStart().startsWith("1 "))
    .map((line) => line.trim().split(/\s+/).slice(14).join(" ").replaceAll("\\", "/").toLowerCase());

function isModelSection(name, lines) {
  if (name.endsWith(".ldr") || name.endsWith(".mpd")) return true;
  return lines.some((line) => /!LDRAW_ORG\s+(Model|Submodel)/i.test(line));
}

function countPlacedParts(name, active = new Set()) {
  if (active.has(name)) throw new Error(`Circular submodel reference: ${name}`);
  const lines = sections.get(name);
  if (!lines) return { count: 1, ids: new Set([name]) };
  if (!isModelSection(name, lines) && name !== rootName) return { count: 1, ids: new Set([name]) };
  const nextActive = new Set(active).add(name);
  let count = 0;
  const ids = new Set();
  for (const reference of references(lines)) {
    const result = sections.has(reference)
      ? countPlacedParts(reference, nextActive)
      : { count: 1, ids: new Set([reference]) };
    count += result.count;
    for (const id of result.ids) ids.add(id);
  }
  return { count, ids };
}

const fetched = new Map();
function standardizedName(name) {
  const normalized = name.replaceAll("\\", "/").toLowerCase();
  if (normalized.startsWith("s/")) return `parts/${normalized}`;
  if (normalized.startsWith("48/")) return `p/${normalized}`;
  return normalized;
}

async function fetchOfficial(name) {
  const sectionName = standardizedName(name);
  if (sections.has(sectionName) || fetched.has(sectionName)) return;
  const diskPath = path.join(projectRoot, ".cache-ldraw", "files", ...sectionName.split("/"));
  let text = existsSync(diskPath) ? await readFile(diskPath, "utf8") : null;
  if (!text) {
    const candidates =
      sectionName.startsWith("parts/") || sectionName.startsWith("p/")
        ? [sectionName]
        : [`parts/${sectionName}`, `p/${sectionName}`];
    for (const candidate of candidates) {
      for (const url of [`${officialBase}/${candidate}`, `${mirrorBase}/${candidate}`]) {
        const response = await fetch(url);
        if (response.ok) {
          text = await response.text();
          await mkdir(path.dirname(diskPath), { recursive: true });
          await writeFile(diskPath, text);
          break;
        }
      }
      if (text) break;
    }
  }
  if (!text) throw new Error(`Official LDraw dependency not found: ${name}`);
  text = text.replaceAll("\\", "/");
  fetched.set(sectionName, text);
  for (const dependency of references(text.split(/\r?\n/))) await fetchOfficial(dependency);
}

for (const lines of sections.values()) {
  for (const reference of references(lines)) {
    if (!sections.has(reference)) await fetchOfficial(reference);
  }
}

let colorConfig = existsSync(colorCache) ? await readFile(colorCache, "utf8") : null;
if (!colorConfig) {
  colorConfig = await fetchText(`${officialBase}/LDConfig.ldr`);
  await mkdir(path.dirname(colorCache), { recursive: true });
  await writeFile(colorCache, colorConfig);
}

const firstBreak = normalizedSource.indexOf("\n");
const packedSource = `${normalizedSource.slice(0, firstBreak + 1)}${colorConfig.trim()}\n${normalizedSource
  .slice(firstBreak + 1)
  .trimEnd()}\n`;
const packed = [packedSource.trimEnd()];
for (const [sectionName, text] of fetched) {
  packed.push(`0 FILE ${sectionName}\n${text.trim()}\n0 NOFILE`);
}

await writeFile(path.join(outputRoot, `${slug}.mpd`), source);
await writeFile(path.join(outputRoot, `${slug}-packed.mpd`), `${packed.join("\n")}\n`);

const placed = countPlacedParts(rootName);
const report = {
  slug,
  set: setNumber,
  title,
  author,
  source: modelUrl,
  license,
  placedParts: placed.count,
  uniquePlacedPartReferences: placed.ids.size,
  authoredSubmodels: [...sections.keys()].filter((name) => isModelSection(name, sections.get(name))).length,
  packedLibraryFiles: fetched.size,
};
await writeFile(path.join(outputRoot, `${slug}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
