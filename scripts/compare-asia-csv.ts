import { readFileSync } from "node:fs";
import { festivals } from "../src/data/festivals";

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

const DUPLICATE_SLUGS = new Set([
  "battle-of-oranges",
  "cheese-rolling-cooper",
  "day-of-dead-oaxaca",
  "kirkpinar-oil-wrestling",
  "up-helly-aa-lerwick"
]);

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: tsx scripts/compare-asia-csv.ts <csv-path>");
  process.exit(1);
}

const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/).slice(1);
const csvAsia = lines.map(parseCsvLine).filter((f) => f[5] === "Asia");
const appAsia = festivals.filter((f) => f.continent === "Asia");
const csvSlugs = new Set(csvAsia.map((f) => f[1]));
const appSlugs = new Set(appAsia.map((f) => f.slug));

const missingInApp = csvAsia.filter((f) => !appSlugs.has(f[1]));
const intentionalDupes = missingInApp.filter((f) => DUPLICATE_SLUGS.has(f[1]));
const trulyMissing = missingInApp.filter((f) => !DUPLICATE_SLUGS.has(f[1]));
const extraInApp = appAsia.filter((f) => !csvSlugs.has(f.slug));

console.log("CSV Asia count:", csvAsia.length);
console.log("App Asia count:", appAsia.length);
console.log("Missing from app (intentional duplicate slugs):", intentionalDupes.length);
for (const f of intentionalDupes) console.log("  dup:", f[1], "-", f[2]);
console.log("Missing from app (unexpected):", trulyMissing.length);
for (const f of trulyMissing) console.log("  MISSING:", f[1], "-", f[2]);
console.log("In app but not CSV:", extraInApp.length);
for (const f of extraInApp) console.log("  extra:", f.slug, "-", f.name);

const outside2026 = appAsia.filter((f) => {
  const startYear = f.startDate.slice(0, 4);
  const endYear = f.endDate.slice(0, 4);
  return startYear !== "2026" && endYear !== "2026";
});
console.log("App Asia with dates outside 2026 (hidden by 2026 season filter):", outside2026.length);
for (const f of outside2026) console.log("  ", f.slug, f.startDate, "-", f.endDate);
