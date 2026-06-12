import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { festivals } from "../src/data/festivals";
import { festivalIdeas } from "../src/data/festival-ideas";
import { scoreFestival } from "../src/lib/festival-utils";
import type { Festival, ScoreLens } from "../src/types/festival";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const allLenses: ScoreLens[] = [
  "partyEnergy",
  "visualSpectacle",
  "culturalDepth",
  "tourismDensity"
];

const lensLabels: Record<ScoreLens, string> = {
  partyEnergy: "Party energy",
  visualSpectacle: "Visual spectacle",
  culturalDepth: "Cultural depth",
  tourismDensity: "Tourism density"
};

function averagePulse(festival: Festival) {
  const total = allLenses.reduce((sum, lens) => sum + festival[lens], 0);
  return Number((total / allLenses.length).toFixed(2));
}

function baseRow(festival: Festival) {
  return {
    id: festival.id,
    slug: festival.slug,
    name: festival.name,
    city: festival.city,
    country: festival.country,
    continent: festival.continent,
    latitude: festival.latitude,
    longitude: festival.longitude,
    startDate: festival.startDate,
    endDate: festival.endDate,
    eventTypes: festival.eventTypes.join("; "),
    partyEnergy: festival.partyEnergy,
    visualSpectacle: festival.visualSpectacle,
    culturalDepth: festival.culturalDepth,
    tourismDensity: festival.tourismDensity,
    averagePulse: averagePulse(festival),
    defaultAppScore: scoreFestival(festival, ["tourismDensity"]),
    bestFor: festival.bestFor.join("; "),
    description: festival.description,
    travelNotes: festival.travelNotes ?? "",
    officialWebsite: festival.officialWebsite ?? "",
    imageUrl: festival.imageUrl,
    galleryImageCount: festival.imageGallery?.length ?? 0
  };
}

function rankingRows(
  festivalsList: Festival[],
  scoreFor: (festival: Festival) => number,
  rankingLabel: string
) {
  return [...festivalsList]
    .map((festival) => ({ festival, score: scoreFor(festival) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.festival.name.localeCompare(b.festival.name);
    })
    .map(({ festival, score }, index) => ({
      rank: index + 1,
      pulseScore: score,
      rankingLens: rankingLabel,
      ...baseRow(festival)
    }));
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ideaInCatalog(idea: string) {
  const target = normalizeName(idea);
  return festivals.some((festival) => {
    const name = normalizeName(festival.name);
    return name === target || name.includes(target) || target.includes(name);
  });
}

function summaryRows() {
  const continents = new Map<string, number>();
  for (const festival of festivals) {
    continents.set(festival.continent, (continents.get(festival.continent) ?? 0) + 1);
  }

  return [
    { metric: "Total festivals in app", value: festivals.length },
    { metric: "Festival ideas backlog (names only)", value: festivalIdeas.length },
    {
      metric: "Ideas not yet in catalog (approx)",
      value: festivalIdeas.filter((idea) => !ideaInCatalog(idea)).length
    },
    { metric: "Export date (UTC)", value: new Date().toISOString() },
    { metric: "", value: "" },
    { metric: "Continent", value: "Count" },
    ...Array.from(continents.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([continent, count]) => ({ metric: continent, value: count }))
  ];
}

const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(summaryRows()),
  "Summary"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(
    [...festivals]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((festival) => baseRow(festival))
  ),
  "All Festivals"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(
    rankingRows(festivals, (festival) => scoreFestival(festival, ["tourismDensity"]), "Default app (tourism density)")
  ),
  "Rank - Default App"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(
    rankingRows(festivals, averagePulse, "Average of all 4 pulse scores")
  ),
  "Rank - Average Pulse"
);

for (const lens of allLenses) {
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rankingRows(festivals, (festival) => festival[lens], lensLabels[lens])
    ),
    `Rank - ${lensLabels[lens]}`.slice(0, 31)
  );
}

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(
    festivalIdeas.map((name, index) => ({
      ideaNumber: index + 1,
      name,
      inCatalogApprox: ideaInCatalog(name) ? "yes" : "no"
    }))
  ),
  "Ideas Backlog"
);

const exportDir = join(root, "exports");
mkdirSync(exportDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const xlsxPath = join(exportDir, `festivo-data-export-${stamp}.xlsx`);
const csvPath = join(exportDir, `festivo-all-festivals-${stamp}.csv`);

XLSX.writeFile(workbook, xlsxPath);

const allFestivalsSheet = [...festivals]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((festival) => baseRow(festival));
writeFileSync(csvPath, XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(allFestivalsSheet)), "utf8");

console.log(`Exported ${festivals.length} festivals`);
console.log(`Excel: ${xlsxPath}`);
console.log(`CSV:   ${csvPath}`);
