import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Festival, FestivalType } from "../src/types/festival";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: tsx scripts/sync-catalog-from-csv.ts <csv-path>");
  process.exit(1);
}

/** Core catalog entries kept in festivals.ts (stable featured set). */
const CORE_SLUGS = new Set([
  "rio-carnival",
  "gion-matsuri",
  "la-tomatina",
  "oktoberfest-munich",
  "carnival-of-venice",
  "las-fallas",
  "kings-day-amsterdam",
  "st-patricks-festival-dublin",
  "san-fermin",
  "notting-hill-carnival",
  "fete-des-lumieres",
  "up-helly-aa",
  "kukeri-festival",
  "battle-of-the-oranges",
  "basel-fasnacht",
  "busojaras",
  "tomorrowland",
  "feria-de-abril",
  "semana-santa-seville",
  "malta-carnival",
  "guca-trumpet-festival",
  "jani-festival",
  "diwali-jaipur"
]);

/** CSV duplicates — canonical slug is kept elsewhere in the catalog. */
const DUPLICATE_SLUGS = new Set([
  "battle-of-oranges",
  "cheese-rolling-cooper",
  "day-of-dead-oaxaca",
  "kirkpinar-oil-wrestling",
  "up-helly-aa-lerwick"
]);

const EVENT_TYPE_MAP: Record<string, FestivalType> = {
  sports: "cultural_heritage",
  religious: "religious_spiritual"
};

const VALID_EVENT_TYPES = new Set<FestivalType>([
  "civic_national_holiday",
  "religious_spiritual",
  "historical",
  "arts",
  "music",
  "food_drink",
  "seasonal",
  "carnival_parade",
  "cultural_heritage"
]);

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

function parseEventTypes(raw: string): FestivalType[] {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => EVENT_TYPE_MAP[part] ?? part)
    .filter((part): part is FestivalType => VALID_EVENT_TYPES.has(part as FestivalType));
}

function parseBestFor(raw: string) {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toScore(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new Error(`Invalid score: ${value}`);
  }
  return n as 1 | 2 | 3 | 4 | 5;
}

function escapeString(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

function festivalFromRow(fields: string[]): Festival {
  const [
    id,
    slug,
    name,
    city,
    country,
    continent,
    latitude,
    longitude,
    startDate,
    endDate,
    eventTypes,
    partyEnergy,
    visualSpectacle,
    culturalDepth,
    tourismDensity,
    ,
    ,
    bestFor,
    description,
    travelNotes,
    officialWebsite,
    imageUrl
  ] = fields;

  const festival: Festival = {
    id,
    slug,
    name,
    description,
    city,
    country,
    continent,
    latitude: Number(latitude),
    longitude: Number(longitude),
    startDate,
    endDate,
    eventTypes: parseEventTypes(eventTypes),
    imageUrl,
    partyEnergy: toScore(partyEnergy),
    visualSpectacle: toScore(visualSpectacle),
    culturalDepth: toScore(culturalDepth),
    tourismDensity: toScore(tourismDensity),
    bestFor: parseBestFor(bestFor)
  };

  if (travelNotes?.trim()) festival.travelNotes = travelNotes;
  if (officialWebsite?.trim()) festival.officialWebsite = officialWebsite;

  return festival;
}

function emitFestival(festival: Festival, indent = "  ") {
  const lines = [
    `${indent}{`,
    `${indent}  id: "${escapeString(festival.id)}",`,
    `${indent}  slug: "${escapeString(festival.slug)}",`,
    `${indent}  name: "${escapeString(festival.name)}",`,
    `${indent}  description: "${escapeString(festival.description)}",`,
    `${indent}  city: "${escapeString(festival.city)}",`,
    `${indent}  country: "${escapeString(festival.country)}",`,
    `${indent}  continent: "${escapeString(festival.continent)}",`,
    `${indent}  latitude: ${festival.latitude},`,
    `${indent}  longitude: ${festival.longitude},`,
    `${indent}  startDate: "${festival.startDate}",`,
    `${indent}  endDate: "${festival.endDate}",`,
    `${indent}  eventTypes: [${festival.eventTypes.map((t) => `"${t}"`).join(", ")}],`,
    `${indent}  imageUrl: "${escapeString(festival.imageUrl)}",`,
    `${indent}  partyEnergy: ${festival.partyEnergy},`,
    `${indent}  visualSpectacle: ${festival.visualSpectacle},`,
    `${indent}  culturalDepth: ${festival.culturalDepth},`,
    `${indent}  tourismDensity: ${festival.tourismDensity},`,
    `${indent}  bestFor: [${festival.bestFor.map((t) => `"${escapeString(t)}"`).join(", ")}],`
  ];

  if (festival.travelNotes) {
    lines.push(`${indent}  travelNotes: "${escapeString(festival.travelNotes)}",`);
  }
  if (festival.officialWebsite) {
    lines.push(`${indent}  officialWebsite: "${escapeString(festival.officialWebsite)}",`);
  }

  lines.push(`${indent}}`);
  return lines.join("\n");
}

const csv = readFileSync(csvPath, "utf8");
const lines = csv.trim().split(/\r?\n/).slice(1);
const festivals = lines
  .map(parseCsvLine)
  .map(festivalFromRow)
  .filter((f) => !DUPLICATE_SLUGS.has(f.slug));

festivals.sort((a, b) => a.name.localeCompare(b.name));

const core = festivals.filter((f) => CORE_SLUGS.has(f.slug)).sort((a, b) => {
  const order = [...CORE_SLUGS];
  return order.indexOf(a.slug) - order.indexOf(b.slug);
});
const more = festivals.filter((f) => !CORE_SLUGS.has(f.slug));

const missingCore = [...CORE_SLUGS].filter((slug) => !core.some((f) => f.slug === slug));
if (missingCore.length) {
  console.warn("Core slugs missing from CSV (skipped):", missingCore.join(", "));
}

const coreFile = `import type { Festival } from "@/types/festival";
import { applyFestivalCopy } from "./festival-content";
import { applyFestivalMedia } from "./festival-media";
import { festivalsMore } from "./festivals-more";

const festivalsRaw: Festival[] = [
${core.map((f) => emitFestival(f)).join(",\n")},
  ...festivalsMore
];

export const festivals: Festival[] = festivalsRaw.map(applyFestivalMedia).map(applyFestivalCopy);
`;

const moreFile = `import type { Festival } from "@/types/festival";

/** Synced from CSV catalog — festivals beyond the core featured set in festivals.ts. */
export const festivalsMore: Festival[] = [
${more.map((f) => emitFestival(f)).join(",\n")}
];
`;

writeFileSync(join(root, "src/data/festivals.ts"), coreFile, "utf8");
writeFileSync(join(root, "src/data/festivals-more.ts"), moreFile, "utf8");

console.log(`Synced ${festivals.length} festivals from CSV`);
console.log(`  Core (festivals.ts): ${core.length}`);
console.log(`  More (festivals-more.ts): ${more.length}`);
