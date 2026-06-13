import { readFileSync } from "node:fs";
import { festivals } from "../src/data/festivals";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: tsx scripts/diff-csv-catalog.ts <csv-path>");
  process.exit(1);
}

const csv = readFileSync(csvPath, "utf8");
const lines = csv.trim().split(/\r?\n/).slice(1);
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

const csvBySlug = new Map<string, string>();
for (const line of lines) {
  const fields = parseCsvLine(line);
  if (fields.length >= 2) csvBySlug.set(fields[1], fields[0]);
}

const appSlugs = festivals.map((f) => f.slug);
const removed = festivals.filter((f) => !csvBySlug.has(f.slug));
const added = [...csvBySlug.keys()].filter((s) => !appSlugs.includes(s));

console.log("CSV count:", csvBySlug.size);
console.log("App count:", appSlugs.length);
console.log("To remove from app:", removed.length);
for (const f of removed) console.log(" -", f.slug, `(${f.name})`);
console.log("In CSV but not app:", added.length);
for (const s of added) console.log(" +", s);
