import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { festivals } from "../src/data/festivals";
import { festivalIdeas } from "../src/data/festival-ideas";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lenses = ["partyEnergy", "visualSpectacle", "culturalDepth", "tourismDensity"] as const;

function avg(f: (typeof festivals)[0]) {
  return Number((lenses.reduce((s, l) => s + f[l], 0) / 4).toFixed(2));
}

function esc(value: unknown) {
  return String(value ?? "").replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, " ");
}

function toTsv(rows: string[][]) {
  return rows.map((row) => row.map(esc).join("\t")).join("\n");
}

const header = [
  "Rank",
  "Name",
  "City",
  "Country",
  "Continent",
  "Start",
  "End",
  "Party",
  "Visual",
  "Cultural",
  "Tourism",
  "Avg Pulse",
  "Event Types",
  "Best For",
  "Description"
];

const ranked = [...festivals]
  .map((f) => ({ f, score: f.tourismDensity }))
  .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name));

const catalogRows = [
  header,
  ...ranked.map(({ f }, i) => [
    String(i + 1),
    f.name,
    f.city,
    f.country,
    f.continent,
    f.startDate,
    f.endDate,
    String(f.partyEnergy),
    String(f.visualSpectacle),
    String(f.culturalDepth),
    String(f.tourismDensity),
    String(avg(f)),
    f.eventTypes.join(", "),
    f.bestFor.join(", "),
    f.description
  ])
];

const alphaRows = [
  ["Name", "City", "Country", "Continent", "Start", "End", "Party", "Visual", "Cultural", "Tourism", "Avg Pulse"],
  ...[...festivals]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => [
      f.name,
      f.city,
      f.country,
      f.continent,
      f.startDate,
      f.endDate,
      String(f.partyEnergy),
      String(f.visualSpectacle),
      String(f.culturalDepth),
      String(f.tourismDensity),
      String(avg(f))
    ])
];

const ideasRows = [
  ["#", "Festival Idea (not yet built or backlog name)"],
  ...festivalIdeas.map((name, i) => [String(i + 1), name])
];

const outDir = join(root, "exports");
mkdirSync(outDir, { recursive: true });

const catalogTsv = toTsv(catalogRows);
const alphaTsv = toTsv(alphaRows);
const ideasTsv = toTsv(ideasRows);

writeFileSync(join(outDir, "festivo-paste-for-claude-ranked.tsv"), catalogTsv, "utf8");
writeFileSync(join(outDir, "festivo-paste-for-claude-alphabetical.tsv"), alphaTsv, "utf8");
writeFileSync(join(outDir, "festivo-paste-for-claude-ideas.tsv"), ideasTsv, "utf8");

const combined = [
  "=== FESTIVO DATA EXPORT ===",
  `Total festivals in app: ${festivals.length}`,
  `Total idea backlog names: ${festivalIdeas.length}`,
  "Ranking default: Tourism density (1-5). Avg Pulse = average of all 4 scores.",
  "",
  "=== ALL FESTIVALS (ranked by Tourism density) ===",
  "Paste into Excel: select cell A1, paste, then Data > Text to Columns > Delimited > Tab",
  "",
  catalogTsv,
  "",
  "=== IDEAS BACKLOG (names only) ===",
  ideasTsv
].join("\n");

writeFileSync(join(outDir, "festivo-paste-for-claude.txt"), combined, "utf8");

console.log(`Wrote paste files to ${outDir}`);
console.log("- festivo-paste-for-claude.txt (everything in one file)");
console.log("- festivo-paste-for-claude-ranked.tsv (best for Excel)");
console.log("- festivo-paste-for-claude-alphabetical.tsv");
console.log("- festivo-paste-for-claude-ideas.tsv");
