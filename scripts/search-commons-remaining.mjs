/**
 * Commons search for festivals still on Unsplash — processes in chunks to avoid rate limits.
 * Run: node scripts/search-commons-remaining.mjs
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const UA = "FestivoWeb/1.0 (commons search)";

const SEARCH_QUERIES = {
  "bohemian-carnevale": ["Masopust Prague", "Bohemian Carnival Prague"],
  "feast-of-st-george-victoria-gozo": ["Victoria Gozo festa", "Gozo village festa fireworks"],
  "festa-della-sensa": ["Festa della Sensa Venice", "Sensa ceremony Venice"],
  "festa-frawli": ["Mgarr strawberry festival Malta", "Malta village festa"],
  "festa-san-filep-zebbug-gozo": ["Zebbug Gozo festa", "Gozo festa band"],
  "hay-festival-hay-on-wye": ["Hay Festival Wales", "Hay Festival tent"],
  "hogmanay": ["Edinburgh Hogmanay fireworks", "Hogmanay celebration"],
  "holy-week-braga": ["Semana Santa Braga procession", "Holy Week Braga"],
  "isle-of-man-tt": ["Isle of Man TT race", "Tourist Trophy motorcycle"],
  "isle-of-mtv-malta": ["Isle of MTV Malta", "Isle of MTV concert"],
  "lajkonik-parade": ["Lajkonik Krakow parade", "Lajkonik"],
  "maastricht-carnival": ["Carnival Maastricht", "Maastricht carnaval"],
  "mardi-gras-new-orleans": ["Mardi Gras New Orleans parade", "Mardi Gras floats New Orleans"],
  "mosta-assumption-feast": ["Mosta festa Malta fireworks", "Mosta dome festa"],
  "pukkelpop": ["Pukkelpop festival", "Pukkelpop main stage"],
  "regata-storica": ["Regata Storica Venice", "Historical Regatta Venice"],
  "romaria-de-viana-do-castelo": ["Romaria Agonia Viana Castelo", "Senhora da Agonia festival"],
  "saint-lucia-festival": ["Santa Lucia Syracuse festival", "Feast of Saint Lucy Syracuse"],
  "santa-marija-feast-victoria-gozo": ["Victoria Gozo festa August", "Malta festa fireworks"],
  "scarlet-sails": ["Scarlet Sails Saint Petersburg", "Alye Parusa festival"],
  "schaferlauf-markgroningen": ["Schäferlauf Markgröningen", "Shepherd's Run Markgroningen"],
  "songkran": ["Songkran festival Thailand", "Songkran water festival"],
  "st-dominic-s-fair": ["St Dominic Fair Gdansk", "St Dominic's Fair Poland"],
  "tbilisoba": ["Tbilisoba festival Tbilisi", "Tbilisoba"],
  "thorrablot-reykjavik": ["Þorrablót Iceland", "Thorrablot festival"],
  "umbria-jazz-festival": ["Umbria Jazz Perugia", "Umbria Jazz festival"]
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function commonsSearch(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&list=search&srnamespace=6&srlimit=8" +
    `&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const txt = await res.text();
  if (txt.startsWith("You are")) return { rateLimited: true };
  const j = JSON.parse(txt);
  return { titles: (j.query?.search ?? []).map((s) => s.title) };
}

async function imageInfo(fileTitle) {
  await sleep(800);
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=imageinfo&iiurlwidth=1280&iiprop=url|extmetadata" +
    `&titles=${encodeURIComponent(fileTitle)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const txt = await res.text();
  if (txt.startsWith("You are")) return { rateLimited: true };
  const j = JSON.parse(txt);
  const page = Object.values(j.query?.pages ?? {})[0];
  if (page?.missing !== undefined) return null;
  const ii = page?.imageinfo?.[0];
  if (!ii?.url) return null;
  const ext = ii.extmetadata ?? {};
  const artist = (ext.Artist?.value || "").replace(/<[^>]+>/g, "").trim();
  const license = (ext.LicenseShortName?.value || "Wikimedia Commons").replace(/<[^>]+>/g, "").trim();
  return {
    title: fileTitle,
    thumb: ii.thumburl || ii.url,
    full: ii.url,
    credit: artist ? `${artist} · Wikimedia Commons · ${license}` : `Wikimedia Commons · ${license}`
  };
}

function score(title, id) {
  const t = title.toLowerCase();
  let s = 0;
  if (/logo|icon|map|flag|coat|svg/i.test(t)) s -= 20;
  if (/portrait|headshot/i.test(t)) s -= 8;
  if (/festival|carnival|carnaval|festa|fiesta|parade|fireworks/i.test(t)) s += 3;
  const words = id.replace(/-/g, " ").split(" ");
  for (const w of words) if (w.length > 3 && t.includes(w)) s += 2;
  return s;
}

async function resolveOne(id, queries) {
  let best = null;
  let bestScore = -99;
  for (const q of queries) {
    await sleep(1500);
    const sr = await commonsSearch(q);
    if (sr.rateLimited) return { rateLimited: true };
    for (const title of sr.titles) {
      if (!/\.(jpe?g|png|webp)/i.test(title)) continue;
      const info = await imageInfo(title);
      if (info?.rateLimited) return { rateLimited: true };
      if (!info) continue;
      const sc = score(title, id);
      if (sc > bestScore) {
        bestScore = sc;
        best = { ...info, query: q, score: sc };
      }
    }
    if (bestScore >= 5) break;
  }
  return best;
}

async function main() {
  const fallbackIds = JSON.parse(
    fs.readFileSync(join(root, "src/data/festival-media-thematic-fallbacks.json"), "utf8")
  ).ids;

  const names = {};
  for (const rel of ["src/data/festivals.ts", "src/data/festivals-more.ts"]) {
    const text = fs.readFileSync(join(root, rel), "utf8");
    const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*name:\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(text))) names[m[1]] = m[2];
  }

  const genPath = join(root, "src/data/festival-media.generated.ts");
  const genText = fs.readFileSync(genPath, "utf8");
  const start = genText.indexOf("{", genText.indexOf("FESTIVAL_MEDIA_GENERATED"));
  const end = genText.lastIndexOf("};");
  const media = JSON.parse(genText.slice(start, end + 1));

  const overrides = JSON.parse(fs.readFileSync(join(__dirname, "festival-media-overrides.json"), "utf8"));
  const resolved = [];

  for (let i = 0; i < fallbackIds.length; i++) {
    const id = fallbackIds[i];
    const queries = SEARCH_QUERIES[id];
    if (!queries) continue;
    process.stdout.write(`\r[${i + 1}/${fallbackIds.length}] ${id}`.padEnd(50));
    const hit = await resolveOne(id, queries);
    if (hit?.rateLimited) {
      console.log("\nRate limited — saving progress.");
      break;
    }
    if (hit) {
      media[id] = {
        imageUrl: hit.thumb,
        imageGallery: [
          { url: hit.full, alt: `${names[id]} — event image`, credit: hit.credit },
          { url: hit.thumb, alt: `${names[id]} — event detail`, credit: hit.credit }
        ]
      };
      overrides.filesById[id] = hit.title;
      resolved.push({ id, title: hit.title, score: hit.score, query: hit.query });
    }
    await sleep(2000);
  }

  fs.writeFileSync(
    genPath,
    `import type { FestivalGalleryImage } from "@/types/festival";

export type FestivalMediaBundle = {
  imageUrl: string;
  imageGallery: FestivalGalleryImage[];
};

/** Auto-generated by scripts/build-festival-media.mjs — do not edit by hand. */
export const FESTIVAL_MEDIA_GENERATED: Record<string, FestivalMediaBundle> = ${JSON.stringify(media, null, 2)};
`,
    "utf8"
  );
  fs.writeFileSync(join(__dirname, "festival-media-overrides.json"), JSON.stringify(overrides, null, 2) + "\n");

  const stillStock = fallbackIds.filter((id) => /unsplash/i.test(media[id]?.imageUrl ?? ""));
  fs.writeFileSync(
    join(root, "src/data/festival-media-thematic-fallbacks.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: stillStock.length, ids: stillStock.sort() }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    join(root, "src/data/festival-media-search-resolve.json"),
    JSON.stringify({ resolved, stillStock }, null, 2),
    "utf8"
  );

  console.log(`\nResolved: ${resolved.length}, still Unsplash: ${stillStock.length}`);
}

main().catch(console.error);
