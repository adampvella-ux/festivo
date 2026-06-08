/**
 * Fetches English Wikipedia intro extracts for festival articles + builds travel notes.
 * Writes src/data/festival-content.generated.ts
 *
 * Run: node scripts/build-festival-copy.mjs
 *
 * Respect https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const UA =
  "FestivoWeb/1.0 (festival guide; local dev; https://github.com/) Node";

/** Direct Wikipedia article titles when search heuristics miss (English Wikipedia). */
const TITLE_OVERRIDES = {
  "basel-fasnacht": "Carnival of Basel",
  "beltane-fire-festival": "Beltane Fire Festival",
  "bohemian-carnevale": "Masopust",
  "busojaras": "Busójárás",
  "diwali-jaipur": "Diwali",
  "fete-des-lumieres": "Festival of Lights (Lyon)",
  "kaziukas-fair": "Saint Casimir's Fair",
  "krampusnacht": "Krampus",
  "mnarja-nadur-gozo": "Mnarja",
  "regata-storica": "Regatta in Venice",
  "sanziene-festival": "Sânziene",
  "sechselauten": "Sechseläuten",
  "victory-day-grand-harbour-regatta": "Victory Day (Malta)",
  "vychodna-folklore-festival": "Východná",
  "romeria-del-rocio": "Romería de El Rocío",
  "scoppio-del-carro": "Scoppio del Carro",
  "fiestas-del-pilar-zaragoza": "Fiestas del Pilar",
  "aste-nagusia-bilbao": "Aste Nagusia",
  "hogueras-de-alicante": "Bonfires of Saint John",
  "moros-y-cristianos-alcoy": "Moors and Christians of Alcoy",
  "calcio-storico-fiorentino": "Calcio Fiorentino",
  "infiorata-di-noto": "Infiorata",
  "carnival-of-binche": "Carnival of Binche",
  "cologne-carnival": "Cologne Carnival",
  "torres-vedras-carnival": "Carnival of Torres Vedras",
  "festival-d-avignon": "Avignon Festival",
  "entroido-verin": "Entroido",
  "carnival-of-cadiz": "Carnival of Cádiz",
  "patum-de-berga": "Patum",
  "fallas-denia": "Falles",
  "festa-dei-ceri-gubbio": "Ceri",
  "festa-del-redentore": "Feast of the Redeemer",
  "madonna-della-bruna-matera": "Madonna della Bruna",
  "notte-della-taranta": "La Notte della Taranta",
  "sagra-del-tartufo-alba": "White truffle",
  "luminara-di-san-ranieri": "Luminara di San Ranieri",
  "feria-de-nimes": "Feria de Nîmes",
  "walpurgisnacht-harz": "Walpurgis Night",
  "hafengeburtstag-hamburg": "Hafengeburtstag",
  "bergkirchweih-erlangen": "Bergkirchweih",
  "rock-am-ring": "Rock am Ring",
  "schaferlauf-markgroningen": "Schäferlauf",
  "hay-festival-hay-on-wye": "Hay Festival",
  "olsok-trondheim": "Olsok",
  "uzgavenes-vilnius": "Užgavėnės",
  "paleni-carodejnic-prague": "Walpurgis Night",
  "prague-spring-international-music-festival": "Prague Spring International Music Festival",
  "rijeka-carnival": "Rijeka Carnival",
  "open-er-festival-gdynia": "Open'er Festival",
  "electric-castle-festival": "Electric Castle",
  "pohoda-festival": "Pohoda",
  "sarajevo-film-festival": "Sarajevo Film Festival",
  "istanbul-tulip-festival": "Istanbul Tulip Festival",
  "kirkpinar-oil-wrestling-festival": "Kırkpınar",
  "malanka-festival-chernivtsi": "Malanka",
  "tbilisoba": "Tbilisoba",
  "iceland-airwaves": "Iceland Airwaves",
  "orthodox-easter-corfu": "Easter",
  "fiesta-santa-marta-de-ribarteme": "Santa Marta de Ribarteme",
  "nuit-blanche-paris": "Nuit Blanche",
  "carnaval-de-dunkerque": "Carnival of Dunkirk",
  "palio-di-siena": "Palio di Siena",
  /** Midsummer in Latvia; avoid “Riga Christmas Market” city fallback. */
  "ligo-festival-riga": "Jāņi"
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseDataFiles() {
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
      const continent = block.match(/continent:\s*"([^"]*)"/)?.[1] ?? "";
      const startDate = block.match(/startDate:\s*"([^"]+)"/)?.[1] ?? "2026-06-01";
      const endDate = block.match(/endDate:\s*"([^"]+)"/)?.[1] ?? startDate;
      const typesMatch = block.match(/eventTypes:\s*\[([\s\S]*?)\]/);
      const eventTypes = typesMatch
        ? typesMatch[1]
            .split(",")
            .map((s) => s.trim().replace(/^"|"$/g, ""))
            .filter(Boolean)
        : [];
      if (!byId.has(id)) {
        byId.set(id, { id, name, city, country, continent, startDate, endDate, eventTypes });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function monthLabel(iso) {
  try {
    const [y, mo] = iso.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long" });
  } catch {
    return "peak dates";
  }
}

/** Rough southern-season flag for packing / “seasonal expectations” wording. */
function isSouthernSeason(continent, country) {
  const cont = String(continent || "");
  if (cont === "South America" || cont === "Oceania") return true;
  const c = String(country || "").toLowerCase();
  return /south africa|namibia|botswana|zimbabwe|zambia|mozambique|madagascar|malawi|swaziland|eswatini|lesotho|australia|new zealand|^chile|^argentina|^uruguay|^paraguay|^peru|^bolivia|^ecuador/.test(c);
}

/**
 * Rotate phrasing deterministically per festival id so adjacent cards aren’t identical.
 */
function pickVariant(id, variants) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * (i + 1)) % 1009;
  }
  return variants[h % variants.length];
}

/** Map local calendar month to a temperate “season band” (rough; flips ~6 months for southern latitudes). */
function seasonCue(monthNum, southern) {
  const m = Number.isFinite(monthNum) ? Math.min(12, Math.max(1, monthNum)) : 6;
  const eff = southern ? ((m + 5) % 12) + 1 : m;
  if (eff === 12 || eff <= 2) return { tag: "winter norms", hint: "short daylight and cold snaps are common—insulated layers and grippy soles matter." };
  if (eff <= 5) return { tag: "spring shoulder-season", hint: "showers swing temperature quickly—carry a compact shell plus a lighter mid-layer." };
  if (eff <= 8) return { tag: "summer heat", hint: "afternoon UV and crowds stack up—hydrate, schedule outdoor blocks earlier or later in the day." };
  return { tag: "autumn shoulder-season", hint: "days shorten and rain returns—plan indoor backups between outdoor segments." };
}

function buildTravelNotes(f) {
  const m = monthLabel(f.startDate);
  const monthNum = Number.parseInt(String(f.startDate).split("-")[1] || "6", 10) || 6;
  const city = f.city;
  const country = f.country;
  const name = f.name;
  const continent = f.continent || "";
  const t = new Set(f.eventTypes || []);
  const southern = isSouthernSeason(continent, country);
  const { tag: seasonTag, hint: seasonHint } = seasonCue(monthNum, southern);
  const yearHint = String(f.startDate).slice(0, 4) || "the listed year";

  const parts = [];

  parts.push(
    `${city}, ${country}, in ${m} usually lines up with ${seasonTag} for travelers—${seasonHint}`
  );

  const lodging = pickVariant(f.id, [
    `Lock lodging with easy access to the main festival spine in ${city}; corridors nearest the route book out first for ${name}.`,
    `Compare stays on both sides of the core venue cluster—cross-town transit can be faster than walking when ${name} compresses foot traffic.`,
    `If prices spike in the historic center, look at a ${city} neighborhood one or two metro stops out, then ride in for peak sessions of ${name}.`
  ]);
  parts.push(lodging);

  if (t.has("carnival_parade")) {
    parts.push(
      `${city} often publishes temporary parade detours only days ahead—save offline maps, favor rail where possible, and stake viewing spots well before the first float.`
    );
  } else if (t.has("music")) {
    parts.push(
      `For ${name}, confirm age limits, re-entry rules, and whether the site is cashless; ear protection helps on main stages and near delay towers.`
    );
  } else if (t.has("religious_spiritual")) {
    parts.push(
      `During ${name}, follow local cues on modest dress, when to silence phones, and where photography is unwelcome—processions can pause regular traffic for hours.`
    );
  } else if (t.has("food_drink")) {
    parts.push(
      `Tasting-led days around ${name} move faster with small cash, translation of common allergens handy, and a light breakfast before long lunch queues in ${city}.`
    );
  } else if (t.has("arts")) {
    parts.push(
      `Ticketed evenings for ${name} may lock doors after start—screenshot QR tickets, arrive with buffer for bag checks at ${city} venues.`
    );
  } else if (t.has("historical")) {
    parts.push(
      `Heritage-heavy programs for ${name} can mean cobblestones, monuments with stair-only access, and timed entries—wear supportive shoes and pre-book tight slots.`
    );
  }

  if (t.has("seasonal") && !t.has("carnival_parade")) {
    parts.push(
      `${name} hinges on outdoor conditions around ${city}—monitor wind and precipitation the week of travel and tuck a packable waterproof in your day bag.`
    );
  }

  if (/cheese|cheese-rolling|cooper'?s\s*hill|hill\s*race/i.test(name)) {
    parts.push(
      `Slope events like ${name} are hazardous up close—stay outside posted safety zones even if crowds press forward on the hill.`
    );
  }

  if (/bull|san\s*ferm[ií]n|encierro|running\s+of\s+the/i.test(name)) {
    parts.push(
      `If ${name} includes live animals in streets, assume stampedes and falls are real risks—balcony viewing or official stands beat chasing sprints in the route.`
    );
  }

  parts.push(
    `Useful searches: “${name} ${yearHint} official tickets”, “${city} ${m} road closures transit”, “${country} travel advisory”, “${name} ${city} visitor FAQ”.`
  );

  return parts.join(" ");
}

function cleanExtract(text) {
  if (!text) return "";
  let s = text.replace(/\s+/g, " ").trim();
  s = s.replace(/\{\{[^}]+\}\}/g, "");
  // Trim to ~3–5 sentences / ~900 chars
  const max = 920;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastPeriod = cut.lastIndexOf(". ");
  return (lastPeriod > 400 ? cut.slice(0, lastPeriod + 1) : cut) + "…";
}

async function wikiSearchTitles(query, limit = 10) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&list=search&srsearch=" +
    encodeURIComponent(query) +
    "&srlimit=" +
    limit;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.query?.search ?? []).map((s) => s.title);
}

function nameTokens(name) {
  return name
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !["the", "and", "for", "day", "san", "st", "saint"].includes(w));
}

function titleMatchesFestival(title, f) {
  const t = title.toLowerCase();
  const toks = nameTokens(f.name);
  return toks.some((tok) => t.includes(tok));
}

/** Require a non-city token from the festival name to appear in the article title (reduces wrong hits). */
function titleAcceptable(title, f) {
  const tl = title.toLowerCase();
  const city = f.city.toLowerCase();
  const nonCity = nameTokens(f.name).filter((w) => w !== city && !["festival", "fair", "day", "night"].includes(w));
  const significant = nonCity.filter((w) => w.length >= 4);
  if (significant.length === 0) {
    return titleMatchesFestival(title, f);
  }
  return significant.some((tok) => tl.includes(tok));
}

function rankTitles(titles, f) {
  const city = f.city.toLowerCase();
  const toks = nameTokens(f.name);
  return [...titles].sort((a, b) => {
    const score = (title) => {
      const tl = title.toLowerCase();
      let s = 0;
      for (const tok of toks) {
        if (tl.includes(tok)) s += 4;
      }
      if (tl.includes(city)) s += 2;
      if (title === f.name) s += 6;
      return s;
    };
    return score(b) - score(a);
  });
}

async function wikiExtract(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=extracts&explaintext=1&exintro=1&titles=" +
    encodeURIComponent(title) +
    "&redirects=1";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return "";
  const j = await res.json();
  const pages = j.query?.pages;
  if (!pages) return "";
  const page = Object.values(pages)[0];
  if (page?.missing) return "";
  return page.extract ?? "";
}

function monthOfStartDate(f) {
  const m = parseInt(String(f.startDate || "").slice(5, 7), 10);
  return Number.isFinite(m) ? m : 0;
}

/** Christmas-market Wikipedia fallbacks are only sensible for late-autumn / winter dates. */
function includeChristmasMarketQueries(f) {
  const m = monthOfStartDate(f);
  if (m === 0) return true;
  return m <= 2 || m >= 10;
}

async function fetchDescription(f) {
  const direct = TITLE_OVERRIDES[f.id];
  if (direct) {
    await sleep(140);
    const ex = await wikiExtract(direct);
    const cleaned = cleanExtract(ex);
    if (cleaned.length > 120) {
      return { text: cleaned, title: direct };
    }
  }
  const queries = [
    `${f.name}`,
    `${f.name} ${f.city}`,
    `${f.name} festival`,
    `${f.city} ${f.name}`,
    `${f.name} ${f.country}`
  ];
  if (includeChristmasMarketQueries(f)) {
    queries.push(`${f.city} Christmas market`, `Christmas in ${f.city}`);
  }
  const seen = new Set();
  for (const q of queries) {
    await sleep(160);
    const titles = await wikiSearchTitles(q, 12);
    const ordered = rankTitles(titles, f);
    for (const title of ordered) {
      if (seen.has(title)) continue;
      const cityNorm = f.city.toLowerCase();
      if (title.toLowerCase() === cityNorm && nameTokens(f.name).length >= 2) {
        const left = f.name
          .toLowerCase()
          .replace(new RegExp(cityNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
          .replace(/[^a-z]+/gi, " ")
          .trim();
        if (left.replace(/[^a-z]+/gi, "").length >= 4) continue;
      }
      if (!titleAcceptable(title, f)) {
        continue;
      }
      seen.add(title);
      await sleep(140);
      const ex = await wikiExtract(title);
      const cleaned = cleanExtract(ex);
      if (cleaned.length > 120) {
        return { text: cleaned, title };
      }
    }
  }
  return { text: "", title: null };
}

async function main() {
  const list = parseDataFiles();
  console.log("Festivals:", list.length);

  const out = {};
  let i = 0;
  for (const f of list) {
    i++;
    process.stdout.write(`\r[${i}/${list.length}] ${f.id}`.padEnd(72));
    const { text, title } = await fetchDescription(f);
    const wikiOk = text.length > 0;
    const description = wikiOk
      ? text
      : `We couldn’t match a solid English Wikipedia entry for “${f.name}” automatically. If you send us a short, verifiable blurb (or a Wikipedia/Wikidata link), we’ll drop it in festival-content-manual.ts. For now: this event is associated with ${f.city}, ${f.country}, around your listed dates—double-check schedules with organizers.`;

    const travelNotes = buildTravelNotes(f);

    out[f.id] = {
      description,
      travelNotes,
      wikipediaTitle: title,
      wikipediaExtractOk: wikiOk
    };
  }

  console.log("\nWriting…");

  const ts = `/** Auto-generated — run scripts/build-festival-copy.mjs. Do not edit by hand. */
export type FestivalCopyBundle = {
  description: string;
  travelNotes: string;
  wikipediaTitle: string | null;
  wikipediaExtractOk: boolean;
};

export const FESTIVAL_COPY_GENERATED: Record<string, FestivalCopyBundle> = ${JSON.stringify(
    out,
    null,
    2
  )};
`;

  fs.writeFileSync(join(root, "src", "data", "festival-content.generated.ts"), ts, "utf8");
  console.log("Done. Gaps (no Wikipedia extract):", Object.values(out).filter((x) => !x.wikipediaExtractOk).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
