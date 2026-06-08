/**
 * Fetches Wikimedia Commons images for each festival and writes
 * src/data/festival-media.generated.ts
 *
 * Run: node scripts/build-festival-media.mjs
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const UA = "FestivoWeb/1.0 (festival guide generator)";

function parseGeneratedCopyMap() {
  const fp = join(root, "src", "data", "festival-content.generated.ts");
  if (!fs.existsSync(fp)) return {};
  const text = fs.readFileSync(fp, "utf8");
  const start = text.indexOf("{", text.indexOf("FESTIVAL_COPY_GENERATED"));
  const end = text.lastIndexOf("};");
  if (start < 0 || end < 0) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

function stripHtml(s) {
  if (!s) return "";
  return String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function metaValue(m, key) {
  const v = m?.[key]?.value;
  return v ? stripHtml(v) : "";
}

/** Parse festival objects from TS data files (id, name, city, country). */
function parseDataFile(relPath) {
  const text = fs.readFileSync(join(root, relPath), "utf8");
  const out = [];
  const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}(?=\s*,|\s*\n)/g;
  let m;
  while ((m = re.exec(text))) {
    const block = m[0];
    const id = m[1];
    const nameMatch = block.match(/name:\s*(\(.*?[^)]\)|"(?:[^"\\]|\\.)*")/s);
    let name = id;
    if (nameMatch) {
      const raw = nameMatch[1].trim();
      if (raw.startsWith('"')) {
        try {
          name = JSON.parse(raw);
        } catch {
          name = raw.replace(/^"|"$/g, "");
        }
      }
    }
    const city = block.match(/city:\s*"([^"]*)"/)?.[1] ?? "";
    const country = block.match(/country:\s*"([^"]*)"/)?.[1] ?? "";
    out.push({ id, name, city, country });
  }
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function imageInfoForTitle(fileTitle) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=imageinfo&iiurlwidth=1400&iiprop=url|extmetadata" +
    `&titles=${encodeURIComponent(fileTitle)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`imageinfo ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error("imageinfo returned non-json");
  const j = await res.json();
  const pages = j.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.url) return null;
  const ext = ii.extmetadata ?? {};
  const artist = metaValue(ext, "Artist") || metaValue(ext, "Credit");
  const license =
    metaValue(ext, "LicenseShortName") ||
    metaValue(ext, "LicensedShortName") ||
    "See file page";
  const shortLicense = license.length > 40 ? "Wikimedia Commons" : license;
  const credit = artist
    ? `${artist} · Wikimedia Commons · ${shortLicense}`
    : `Wikimedia Commons · ${shortLicense}`;
  const mime = metaValue(ext, "MIME_type") || "";
  if (mime.includes("svg") || mime.includes("webm") || mime.includes("gif")) {
    return null;
  }
  const thumb = ii.thumburl || ii.url;
  const full = ii.url;
  if (!/\.(jpe?g|png|webp)(\?|$)/i.test(full) && !/\/thumb\//i.test(thumb)) {
    return null;
  }
  return { thumb, full, credit, title: fileTitle };
}

async function commonsFileSearch(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&list=search&srnamespace=6&srlimit=12" +
    `&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return [];
  const j = await res.json();
  return (j.query?.search ?? []).map((s) => s.title);
}

async function wikipediaPageImage(articleTitle) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=pageimages&piprop=thumbnail|original&pithumbsize=1600" +
    `&titles=${encodeURIComponent(articleTitle)}&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  const j = await res.json();
  const pages = j.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const src = page?.original?.source || page?.thumbnail?.source;
  if (!src) return null;
  if (!/\.(jpe?g|png|webp)(\?|$)/i.test(src)) return null;
  return {
    thumb: page?.thumbnail?.source || src,
    full: src,
    credit: `Wikimedia (from Wikipedia article "${articleTitle}")`,
    title: articleTitle
  };
}

async function wikipediaSearchTitle(query) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&list=search&srlimit=5" +
    `&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  const j = await res.json();
  const hits = j.query?.search ?? [];
  return hits[0]?.title ?? null;
}

function isOkFileTitle(t) {
  const lower = t.toLowerCase();
  if (lower.includes(".svg")) return false;
  return true;
}

async function wikipediaPageImageRetry(articleTitle, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const img = await wikipediaPageImage(articleTitle);
    if (img) return img;
    await sleep(1200 * (i + 1));
  }
  return null;
}

/** Strip trailing "— City" style qualifiers for search (keep hyphenated names). */
function stripDisplayQualifier(name) {
  const s = String(name).trim();
  const idx = s.indexOf("—");
  if (idx >= 0) {
    const left = s.slice(0, idx).trim();
    if (left.length >= 3) return left;
  }
  return s;
}

function uniqueStrings(list) {
  const out = [];
  const seen = new Set();
  for (const v of list) {
    const t = String(v || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function buildCommonsSearchTerms(f) {
  const base = stripDisplayQualifier(f.name);
  const raw = String(f.name).trim();
  const city = f.city || "";
  const country = f.country || "";
  const slugWords = f.id.replace(/-/g, " ");
  return uniqueStrings([
    raw,
    base,
    `${base} ${city}`,
    `${raw} ${city}`,
    `${base} festival`,
    `${city} festival`,
    `${city} carnival`,
    `${city} ${country}`,
    `${base} ${country}`,
    slugWords,
    `${slugWords} ${city}`,
    `${slugWords} ${country}`
  ]);
}

const overridesPath = join(__dirname, "festival-media-overrides.json");
const mediaOverrides = fs.existsSync(overridesPath)
  ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
  : { filesById: {}, wikipediaTitleById: {} };

/**
 * Hand-picked Commons files when automated search returns irrelevant images
 * (e.g. tomatoes for La Tomatina). Titles must match Wikimedia exactly.
 */
const COMMONS_FILE_BY_ID = {
  ...(mediaOverrides.filesById ?? {}),
  "la-tomatina": "File:Tomatina 2006.jpg",
  "palio-di-siena": "File:Palio di Siena 2008 (2).jpg",
  "basel-fasnacht": "File:Carnival of Basel 2015 (Basler Fasnacht 2015).jpg",
  "krampusnacht": "File:Krampus Salzburg 2.jpg"
};

const WIKIPEDIA_TITLE_BY_ID = mediaOverrides.wikipediaTitleById ?? {};

const UNSPLASH = (photoId) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;

/** Last resort: rights-friendly Unsplash image matched to festival theme. */
function fallbackThematicBundle(f) {
  const hay = `${f.id} ${f.name} ${f.city} ${f.country}`.toLowerCase();
  const pick = (photoId, theme) => ({
    thumb: UNSPLASH(photoId),
    full: UNSPLASH(photoId),
    credit: `Thematic stock photo · Unsplash · ${theme}`,
    title: `Stock (${theme})`
  });

  /* Photo IDs are reused from src/data/festivals.ts placeholders (known-good Unsplash assets). */
  if (/balloon|albuquerque/.test(hay)) return pick("1472396961693-142e6e269027", "open sky and celebration");
  if (/isle-of-man-tt/.test(hay)) return pick("1477587458883-47145ed94245", "night roads and speed");
  if (/tulip|infiorata|flower\s*festival|madeira-flower|patios-de-cordoba|rose-festival/.test(hay))
    return pick("1529156069898-49953e39b3ac", "color and festival atmosphere");
  if (/batalla-del-vino|wine\s*battle/.test(hay)) return pick("1499377193864-82682aefed04", "wine country");
  if (/la-tomatina|tomatina/.test(hay)) return pick("1529156069898-49953e39b3ac", "messy colorful celebration");
  if (/holi/.test(hay)) return pick("1529156069898-49953e39b3ac", "color and joy");
  if (/songkran/.test(hay)) return pick("1472396961693-142e6e269027", "summer water fun");
  if (/pingxi|sky\s*lantern|chinese-new-year/.test(hay)) return pick("1517086822157-2b0358e7684a", "warm festival lights");
  if (/day-of-the-dead|muertos/.test(hay)) return pick("1514525253161-7a46d19cd819", "masks and tradition");
  if (/burning-man/.test(hay)) return pick("1492571350019-22de08371fd3", "desert horizon");
  if (/coachella/.test(hay)) return pick("1492684223066-81342ee5ff30", "outdoor festival crowd");
  if (/mardi-gras|new-orleans/.test(hay)) return pick("1529156069898-49953e39b3ac", "parade color and energy");
  if (/barranquilla/.test(hay)) return pick("1529156069898-49953e39b3ac", "street carnival color");
  if (/jazz|montreux|umbria-jazz/.test(hay)) return pick("1521334884684-d80222895322", "live music");
  if (/pride|lgbt|amsterdam-pride/.test(hay)) return pick("1529156069898-49953e39b3ac", "celebration and color");
  if (/amsterdam-dance-event|distortion-copenhagen|\bdistortion\b|ultra-europe-split|electric-castle-festival/.test(hay))
    return pick("1502741338009-cac2772e18bc", "festival lights and energy");
  if (/wacken|rock-am-ring/.test(hay)) return pick("1470229722913-7c0e2dbbafd3", "big outdoor concert");
  if (/sarajevo-film|film\s*festival/.test(hay)) return pick("1516307365426-bea591f05011", "culture and gathering");
  if (/festival-d-avignon|theatre|theater/.test(hay)) return pick("1507838153414-b4b713384a76", "performance and drama");
  if (/athens-epidaurus|prague-spring|george-enescu|classical/.test(hay))
    return pick("1507838153414-b4b713384a76", "orchestral performance");
  if (/iceland-airwaves|thorrablot|þorrablót/.test(hay)) return pick("1460353581641-37baddab0fa2", "wide open landscape");
  if (/valkenburg-christmas|advent-zagreb|sinterklaas|christmas\s*market/.test(hay))
    return pick("1517086822157-2b0358e7684a", "festival lights at night");
  if (/beltane|bonfire|lewes|hogueras|walpurgis|paleni|witch/.test(hay))
    return pick("1467269204594-9661b134dd2b", "fire and spectacle");
  if (/bastille|fireworks|luminara|redentore|scoppio|fireworks-festival|malta-international-fireworks/.test(hay))
    return pick("1467269204594-9661b134dd2b", "fireworks celebration");
  if (/easter|orthodox|semana-santa|holy-week|romeria|rocio|feast-of-st|assumption|patron|zejtun|birkirkara|mnarja|nadur|gozo-feast|santa-marta|santa-marija|mosta|victory-day|regatta/.test(hay))
    return pick("1516483638261-f4dbaf036963", "historic celebration");
  if (/carnival|carnaval|fasnacht|busojaras|busó|dunkerque|binche|cadiz|cádiz|rijeka|kotor|tenerife|torres-vedras|viareggio|rotterdam-summer|bohemian-carnevale|cologne-carnival|entroido|fallas|moros-y-cristianos|patum|sardine|el-colacho|lajkonik|uzgavenes|malanka|kurentovanje/.test(hay))
    return pick("1514525253161-7a46d19cd819", "carnival masks and crowd");
  if (/calcio-storico|oil-wrestling|kirkpinar/.test(hay)) return pick("1533174072545-7a4b6ad7a6c3", "traditional outdoor gathering");
  if (/transhumance|schaferlauf|sheep/.test(hay)) return pick("1460353581641-37baddab0fa2", "countryside tradition");
  if (/hay-festival/.test(hay)) return pick("1516307365426-bea591f05011", "books and ideas");
  if (/signal-festival|nuit-blanche/.test(hay)) return pick("1502741338009-cac2772e18bc", "urban night spectacle");
  if (/fete-de-la-musique|street\s*music/.test(hay)) return pick("1528701800489-20be3c4ea0f0", "street performance energy");
  if (/braderie|flea|feria-de-nimes|fetes-de-bayonne|aste-nagusia/.test(hay))
    return pick("1519677100203-a0e668c92439", "busy city festival");
  if (/tamborrada|drum/.test(hay)) return pick("1528701800489-20be3c4ea0f0", "rhythm and parade");
  if (/taranta|folk\s*dance|pagan|sânziene|sanziene|ligo|juhannus|midsummer|olsok|sami-easter/.test(hay))
    return pick("1533174072545-7a4b6ad7a6c3", "folk festival gathering");
  if (/tbilisoba|georgian/.test(hay)) return pick("1529336953121-ad5a0d43d0d2", "food and social celebration");
  if (/vienna-ball|waltz|ball-season/.test(hay)) return pick("1507838153414-b4b713384a76", "elegant evening performance");
  if (/sagra|truffle|calcotada|calçot/.test(hay)) return pick("1532634896-26909d0d4b6d", "feasting together");
  if (/tallinn-medieval|sighisoara-medieval|ommegang|medieval/.test(hay))
    return pick("1519677100203-a0e668c92439", "historic city festival");
  if (/glastonbury|roskilde|open-er|flow-festival|pohoda|sziget|exit-festival|rockwave|fuji-rock|isle-of-mtv/.test(hay))
    return pick("1470229722913-7c0e2dbbafd3", "large music festival");
  if (/oktoberfest|bergkirchweih|cannstatter|volksfest|bier/.test(hay))
    return pick("1532634896-26909d0d4b6d", "beer hall festival atmosphere");
  if (/hafengeburtstag|harbor|harbour|port\s*festival/.test(hay)) return pick("1519003722824-194d4455a60c", "waterfront city");
  if (/istanbul/.test(hay)) return pick("1519677100203-a0e668c92439", "city festival energy");
  if (/gion|matsuri|fuji-rock/.test(hay)) return pick("1533174072545-7a4b6ad7a6c3", "traditional summer festival");

  return pick("1492684223066-81342ee5ff30", "festival crowd energy");
}

async function main() {
  const copyMap = parseGeneratedCopyMap();
  const fromMain = parseDataFile("src/data/festivals.ts");
  const fromMore = parseDataFile("src/data/festivals-more.ts");
  const byId = new Map();
  for (const f of [...fromMain, ...fromMore]) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  const list = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  console.log("Festival count:", list.length);

  const media = {};
  const thematicFallbackIds = [];
  let i = 0;
  for (const f of list) {
    i++;
    process.stdout.write(`\r[${i}/${list.length}] ${f.id}`.padEnd(70));
    const wikiTitle =
      WIKIPEDIA_TITLE_BY_ID[f.id] ?? copyMap?.[f.id]?.wikipediaTitle ?? f.name;
    let fromWiki = null;

    const explicitFirst = COMMONS_FILE_BY_ID[f.id];
    if (explicitFirst) {
      try {
        fromWiki = await imageInfoForTitle(explicitFirst);
      } catch {
        fromWiki = null;
      }
      await sleep(400);
    }

    if (!fromWiki) {
      try {
        fromWiki = await wikipediaPageImageRetry(wikiTitle, 4);
      } catch {
        fromWiki = null;
      }
      await sleep(900);
    }
    if (!fromWiki) {
      const searchedTitle =
        (await wikipediaSearchTitle(`${f.name} festival ${f.city}`)) ||
        (await wikipediaSearchTitle(`${f.name} ${f.city}`)) ||
        (await wikipediaSearchTitle(stripDisplayQualifier(f.name))) ||
        (await wikipediaSearchTitle(f.name));
      await sleep(700);
      if (searchedTitle) {
        fromWiki = await wikipediaPageImageRetry(searchedTitle, 3);
      }
    }
    if (!fromWiki) {
      for (const q of buildCommonsSearchTerms(f)) {
        let titles = [];
        try {
          titles = await commonsFileSearch(q);
        } catch {
          titles = [];
        }
        await sleep(550);
        for (const t of titles) {
          if (!isOkFileTitle(t)) continue;
          try {
            const info = await imageInfoForTitle(t);
            await sleep(350);
            if (info) {
              fromWiki = info;
              break;
            }
          } catch {
            /* try next file */
          }
        }
        if (fromWiki) break;
      }
    }
    let usedThematic = false;
    if (!fromWiki) {
      fromWiki = fallbackThematicBundle(f);
      usedThematic = true;
    }
    if (usedThematic) thematicFallbackIds.push(f.id);
    const images = [
      {
        url: fromWiki.full,
        alt: `${f.name} — event image`,
        credit: fromWiki.credit
      },
      {
        url: fromWiki.thumb || fromWiki.full,
        alt: `${f.name} — event detail`,
        credit: fromWiki.credit
      }
    ];
    media[f.id] = {
      imageUrl: fromWiki.thumb || fromWiki.full,
      imageGallery: images
    };
  }
  console.log("\nWriting generated registry…");

  const ts = `import type { FestivalGalleryImage } from "@/types/festival";

export type FestivalMediaBundle = {
  imageUrl: string;
  imageGallery: FestivalGalleryImage[];
};

/** Auto-generated by scripts/build-festival-media.mjs — do not edit by hand. */
export const FESTIVAL_MEDIA_GENERATED: Record<string, FestivalMediaBundle> = ${JSON.stringify(
    media,
    null,
    2
  )};
`;

  const outPath = join(root, "src", "data", "festival-media.generated.ts");
  fs.writeFileSync(outPath, ts, "utf8");
  console.log("Wrote", outPath);

  const thematicPath = join(root, "src", "data", "festival-media-thematic-fallbacks.json");
  fs.writeFileSync(
    thematicPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Festivals that used thematic Unsplash images because no Wikimedia page image or Commons match was found.",
        count: thematicFallbackIds.length,
        ids: thematicFallbackIds.sort()
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("Wrote", thematicPath);

  if (thematicFallbackIds.length > 0) {
    console.log(
      "\nThematic Unsplash fallback (no Wikimedia image found):",
      thematicFallbackIds.length,
      "festivals"
    );
    console.log(thematicFallbackIds.join(", "));
  }
  console.log("Tip: npm run report:festival-media-gaps — lists ids with no Wikimedia bundle (after manual overrides).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
