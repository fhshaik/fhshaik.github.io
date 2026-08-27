import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const cacheRoot = path.join(projectRoot, ".cache-ldraw", "omr-10281");
const outputRoot = path.join(projectRoot, "public", "ldraw");
const modelUrl = "https://library.ldraw.org/library/omr/10281-1_Cherry-Blossoms.mpd";
const officialBase = "https://library.ldraw.org/library/official";
const mirrorBase = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw";
const modelCache = path.join(cacheRoot, "10281-1_Cherry-Blossoms.mpd");
const colorCache = path.join(cacheRoot, "LDConfig.ldr");

await mkdir(cacheRoot, { recursive: true });
await mkdir(outputRoot, { recursive: true });

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`);
  return response.text();
}

const source = existsSync(modelCache) ? await readFile(modelCache, "utf8") : await fetchText(modelUrl);
if (!existsSync(modelCache)) await writeFile(modelCache, source);
if (!source.includes("0 Author: Orion Pobursky [OrionP]")) throw new Error("Unexpected OMR model author");
if (!source.includes("0 !LICENSE Redistributable under CCAL version 2.0")) throw new Error("Unexpected OMR model license");

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
if (!rootName) throw new Error("OMR model has no root FILE section");

const references = (lines) => lines
  .filter((line) => line.trimStart().startsWith("1 "))
  .map((line) => line.trim().split(/\s+/).slice(14).join(" ").replaceAll("\\", "/").toLowerCase());

function isModelSection(name, lines) {
  if (name.endsWith(".ldr") || name.endsWith(".mpd")) return true;
  return lines.some((line) => /!LDRAW_ORG\s+(Model|Submodel)/i.test(line));
}

function countPlacedParts(name, active = new Set()) {
  if (active.has(name)) throw new Error(`Circular OMR submodel reference: ${name}`);
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
  const diskPath = path.join(cacheRoot, "files", ...sectionName.split("/"));
  let text = existsSync(diskPath) ? await readFile(diskPath, "utf8") : null;
  if (!text) {
    const candidates = sectionName.startsWith("parts/") || sectionName.startsWith("p/")
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
  await writeFile(colorCache, colorConfig);
}

const firstBreak = normalizedSource.indexOf("\n");
const packedSource = `${normalizedSource.slice(0, firstBreak + 1)}${colorConfig.trim()}\n${normalizedSource.slice(firstBreak + 1).trimEnd()}\n`;
const packed = [packedSource.trimEnd()];
for (const [sectionName, text] of fetched) packed.push(`0 FILE ${sectionName}\n${text.trim()}\n0 NOFILE`);

const rawPath = path.join(outputRoot, "10281-cherry-blossoms.mpd");
const packedPath = path.join(outputRoot, "10281-cherry-blossoms-packed.mpd");
await writeFile(rawPath, source);
await writeFile(packedPath, `${packed.join("\n")}\n`);

const placed = countPlacedParts(rootName);
const report = {
  set: "10281-1 Bonsai — Cherry Blossoms",
  author: "Orion Pobursky [OrionP]",
  source: modelUrl,
  license: "CCAL 2.0 / CC BY 2.0",
  placedParts: placed.count,
  uniquePlacedPartReferences: placed.ids.size,
  authoredSubmodels: [...sections.keys()].filter((name) => isModelSection(name, sections.get(name))).length,
  packedLibraryFiles: fetched.size,
  missingParts: 0,
  missingPatterns: 0,
  missingStickers: 0,
};
await writeFile(path.join(outputRoot, "10281-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
