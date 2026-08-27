/**
 * Imports an official LEGO set from the LDraw Official Model Repository and
 * packs it into a single self-contained `.mpd` the site can load with no extra
 * requests.
 *
 * Usage:
 *   node scripts/import-ldraw-set.mjs <source> [--slug my-name] [--variant N]
 *                                     [--allow-unlicensed]
 *
 * `source` is any of:
 *   - an OMR set id             1383
 *   - a direct model URL        https://.../21043-1.mpd
 *   - a local file path         ~/Downloads/21333 - The Starry Night.mpd
 *   - a local Stud.io archive   ~/Downloads/model.io      (zip containing .ldr)
 *
 * Examples:
 *   node scripts/import-ldraw-set.mjs 1383 --slug cherry-blossoms
 *   node scripts/import-ldraw-set.mjs "~/Downloads/21333 - The Starry Night.mpd" \
 *     --slug starry-night --allow-unlicensed
 *
 * Builds are authored by other people, never generated here. The script records
 * the author and licence of whatever it imports. By default it refuses a model
 * without a redistributable licence; `--allow-unlicensed` downgrades that to a
 * warning, for models you have your own right to use. Anything imported that
 * way is yours to clear before publishing it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    [
      "usage: node scripts/import-ldraw-set.mjs <source> [--slug name] [--variant n] [--allow-unlicensed]",
      "",
      "  source:  an OMR set id (1383), a model URL, a local .mpd/.ldr path,",
      "           or a local Stud.io .io archive",
    ].join("\n"),
  );
  process.exit(1);
}

const target = args[0];
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const variant = Number(flag("variant", "0"));
const allowUnlicensed = args.includes("--allow-unlicensed");

/** Expands a leading `~` so a pasted Downloads path just works. */
const expandHome = (input) =>
  input.startsWith("~") ? path.join(os.homedir(), input.slice(1)) : input;

/** Stud.io `.io` files are zip archives with the model inside as LDraw text. */
function readArchive(file) {
  const names = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const candidates = names.filter((name) => /\.(ldr|mpd|dat)$/i.test(name));
  if (candidates.length === 0) {
    throw new Error(
      `No .ldr/.mpd found inside ${path.basename(file)} (contains: ${names.slice(0, 8).join(", ")})`,
    );
  }
  // Prefer an explicit model.ldr, else the largest candidate.
  const preferred =
    candidates.find((name) => /(^|\/)model\.ldr$/i.test(name)) ??
    candidates.sort((a, b) => b.length - a.length)[0];
  console.log(`extracting ${preferred} from ${path.basename(file)}`);
  return execFileSync("unzip", ["-p", file, preferred], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
}

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "public", "ldraw");
const officialBase = "https://library.ldraw.org/library/official";
const mirrorBase =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw";
// Some sets reference primitives that only exist in the unofficial library.
const unofficialBase = "https://library.ldraw.org/library/unofficial";
/** Dependencies nothing could supply. Recorded, not fatal. */
const missing = new Set();

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`);
  return response.text();
}

/**
 * Resolves the input to a model: a local file (plain or zipped), a direct URL,
 * or an OMR set id.
 */
async function resolveModelUrl(input) {
  const local = expandHome(input);
  if (existsSync(local)) {
    const isZip = readFileSync(local, { start: 0, end: 1 }).toString("latin1") === "PK";
    return {
      modelUrl: local,
      title: null,
      localText: isZip ? readArchive(local) : await readFile(local, "utf8"),
    };
  }
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

const { modelUrl, title, localText } = await resolveModelUrl(target);
const setNumber = path.basename(modelUrl).match(/(\d{4,6})/)?.[1] ?? "set";
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

const source =
  localText ??
  (existsSync(modelCache) ? await readFile(modelCache, "utf8") : await fetchText(modelUrl));
if (!existsSync(modelCache)) await writeFile(modelCache, source);

const author = source.match(/^0 Author:\s*(.+)$/m)?.[1]?.trim() ?? "Unknown";
const license = source.match(/^0 !LICENSE\s*(.+)$/m)?.[1]?.trim() ?? "";
/**
 * Licences that permit redistribution. LDraw models mostly say "Redistributable
 * under CCAL", but newer OMR submissions use Creative Commons wording instead —
 * CC BY and CC0 are redistributable too, so matching only the word
 * "redistributable" wrongly rejected them.
 */
const REDISTRIBUTABLE = /redistributable|CCAL|CC[\s-]?BY|CC0|public domain/i;
if (!REDISTRIBUTABLE.test(license)) {
  const message = `Model licence does not clearly permit redistribution (licence: "${license || "none"}")`;
  if (!allowUnlicensed) {
    throw new Error(`${message}. Pass --allow-unlicensed if you have the right to use it.`);
  }
  console.warn(`warning: ${message} — importing anyway (--allow-unlicensed)`);
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

/**
 * Downloads every official part the model references, transitively.
 *
 * A worked set pulls 250-350 part files. Fetching them one at a time is what
 * made an import take minutes, so this runs a small worker pool over a queue
 * that the workers themselves keep extending as they discover sub-parts. Parts
 * are cached on disk and shared across imports, so later sets get faster still.
 */
const CONCURRENCY = 8;

/**
 * Fetches with retries.
 *
 * Eight workers hitting library.ldraw.org will occasionally be throttled, and
 * treating a 429/503 as "part does not exist" silently dropped real geometry —
 * models came out with holes and a misleading "unavailable" warning. Only a 404
 * is taken as a definite answer.
 */
async function fetchWithRetry(url, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 404) return null;
      // Anything else (429, 5xx) is transient: back off and try again.
    } catch {
      // Network error: also transient.
    }
    await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
  }
  return null;
}
const queue = [];
const queued = new Set();

function enqueue(name) {
  const sectionName = standardizedName(name);
  if (sections.has(sectionName) || queued.has(sectionName)) return;
  queued.add(sectionName);
  queue.push(sectionName);
}

async function fetchOne(sectionName) {
  const diskPath = path.join(projectRoot, ".cache-ldraw", "files", ...sectionName.split("/"));
  let text = existsSync(diskPath) ? await readFile(diskPath, "utf8") : null;

  if (!text) {
    const candidates =
      sectionName.startsWith("parts/") || sectionName.startsWith("p/")
        ? [sectionName]
        : [`parts/${sectionName}`, `p/${sectionName}`];
    for (const candidate of candidates) {
      const urls = [
        `${officialBase}/${candidate}`,
        `${mirrorBase}/${candidate}`,
        `${unofficialBase}/${candidate}`,
      ];
      for (const url of urls) {
        const response = await fetchWithRetry(url);
        if (response) {
          text = await response.text();
          await mkdir(path.dirname(diskPath), { recursive: true });
          await writeFile(diskPath, text);
          break;
        }
      }
      if (text) break;
    }
  }

  if (!text) {
    // A single unavailable primitive should not sink a whole set: the loader
    // skips the reference and the rest of the model still renders. Recorded in
    // the report so it is visible rather than silent.
    missing.add(sectionName);
    return;
  }
  text = text.replaceAll("\\", "/");
  fetched.set(sectionName, text);
  for (const dependency of references(text.split(/\r?\n/))) enqueue(dependency);
}

for (const lines of sections.values()) {
  for (const reference of references(lines)) enqueue(reference);
}

let active = 0;
let done = 0;
async function worker() {
  for (;;) {
    const next = queue.shift();
    if (next === undefined) {
      // Another worker may still be about to enqueue sub-parts.
      if (active === 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
      continue;
    }
    active += 1;
    try {
      await fetchOne(next);
      done += 1;
      if (done % 50 === 0) process.stdout.write(`  ${done} parts…\n`);
    } finally {
      active -= 1;
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`  ${fetched.size} part files packed`);
if (missing.size > 0) {
  console.warn(
    `  warning: ${missing.size} dependency(ies) unavailable and skipped: ${[...missing].slice(0, 6).join(", ")}${missing.size > 6 ? ", …" : ""}`,
  );
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
  license: license || null,
  unlicensed: !REDISTRIBUTABLE.test(license) || undefined,
  placedParts: placed.count,
  uniquePlacedPartReferences: placed.ids.size,
  authoredSubmodels: [...sections.keys()].filter((name) => isModelSection(name, sections.get(name))).length,
  packedLibraryFiles: fetched.size,
  missingDependencies: missing.size > 0 ? [...missing] : undefined,
};
await writeFile(path.join(outputRoot, `${slug}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
