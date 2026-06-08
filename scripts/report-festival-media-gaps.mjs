/**
 * Lists festivals that have no Wikimedia bundle yet (no generated row and no manual override).
 * Writes src/data/festival-media-missing.json for planning manual uploads.
 *
 * Run: node scripts/report-festival-media-gaps.mjs
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseFestivalSummaries() {
  const paths = ["src/data/festivals.ts", "src/data/festivals-more.ts"];
  const byId = new Map();
  for (const rel of paths) {
    const text = fs.readFileSync(join(root, rel), "utf8");
    const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}(?=\s*,|\s*\n)/g;
    let m;
    while ((m = re.exec(text))) {
      const block = m[0];
      const id = m[1];
      const nameMatch = block.match(/name:\s*("(?!")(?:[^"\\]|\\.)*")/);
      let name = id;
      if (nameMatch) {
        try {
          name = JSON.parse(nameMatch[1]);
        } catch {
          name = nameMatch[1].replace(/^"|"$/g, "");
        }
      }
      const city = block.match(/city:\s*"([^"]*)"/)?.[1] ?? "";
      const country = block.match(/country:\s*"([^"]*)"/)?.[1] ?? "";
      if (!byId.has(id)) byId.set(id, { id, name, city, country });
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function parseGeneratedMediaKeys() {
  const fp = join(root, "src/data/festival-media.generated.ts");
  const text = fs.readFileSync(fp, "utf8");
  const keys = new Set();
  const re = /^\s{2}"([^"]+)": \{\s*$/gm;
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
  return keys;
}

function parseManualMediaKeys() {
  const fp = join(root, "src/data/festival-media-manual.ts");
  const text = fs.readFileSync(fp, "utf8");
  const keys = new Set();
  const re = /^\s{2}"([^"]+)": \{\s*$/gm;
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
  return keys;
}

function main() {
  const festivals = parseFestivalSummaries();
  const genKeys = parseGeneratedMediaKeys();
  const manualKeys = parseManualMediaKeys();
  const covered = new Set([...genKeys, ...manualKeys]);
  const missing = festivals.filter((f) => !covered.has(f.id));
  const out = {
    generatedAt: new Date().toISOString(),
    note:
      "Festivals listed here have no row in festival-media.generated.ts and no festival-media-manual.ts override. After `npm run build:festival-media`, every festival should have a generated row (Wikimedia or thematic Unsplash); see festival-media-thematic-fallbacks.json for ids that used stock photos.",
    totalCatalog: festivals.length,
    generatedMediaKeys: genKeys.size,
    manualOverrideKeys: manualKeys.size,
    missingCount: missing.length,
    missing
  };
  const outPath = join(root, "src/data/festival-media-missing.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Missing Wikimedia bundles: ${missing.length} / ${festivals.length}`);
  if (missing.length) console.log(missing.map((m) => m.id).join(", "));
}

main();
