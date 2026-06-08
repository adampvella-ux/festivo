/**
 * Searches Wikimedia Commons for real image files for festivals that failed
 * override resolution, then patches festival-media-overrides.json.
 *
 * Run: node scripts/resolve-commons-batch.mjs
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const UA = "FestivoWeb/1.0 (commons batch resolver)";

const overridesPath = join(__dirname, "festival-media-overrides.json");
const reportPath = join(root, "src", "data", "festival-media-resolve-report.json");

/** Verified Commons files when search is unreliable. */
const KNOWN_GOOD = {
  "la-tomatina": "File:Tomatina 2006.jpg",
  "romeria-del-rocio": "File:Hermandad de Triana en la Romería de El Rocío 2014.jpg",
  "coachella": "File:Coachella 2014 main stage.jpg",
  "hogmanay": "File:Edinburgh Hogmanay 2012-2013 fireworks.jpg",
  "mardi-gras-new-orleans": "File:Mardi Gras 2014 New Orleans 1.jpg",
  "songkran": "File:Songkran Chiang Mai.jpg",
  "regata-storica": "File:Regata Storica 2008.jpg",
  "luminara-di-san-ranieri": "File:Luminara di San Ranieri.jpg",
  "viareggio-carnival": "File:Carnevale di Viareggio 2008.jpg",
  "scarlet-sails": "File:Scarlet Sails 2014 in Saint Petersburg.jpg",
  "el-colacho": "File:El Colacho (Castrillo de Murcia).jpg",
  "holi-festival-mathura": "File:Holi Festival of Colors Utah, United States 2013.jpg",
  "isle-of-man-tt": "File:TT Race Start.jpg",
  "pukkelpop": "File:Pukkelpop 2012.jpg",
  "untold-festival": "File:Untold Festival 2015 - Main Stage.jpg",
  "electric-castle-festival": "File:Electric Castle 2015 - Main Stage.jpg",
  "flow-festival-helsinki": "File:Flow Festival 2012.jpg",
  "hay-festival-hay-on-wye": "File:Hay Festival 2013.jpg",
  "umbria-jazz-festival": "File:Umbria Jazz 2011.jpg",
  "holy-week-braga": "File:Semana Santa Braga 2012 (2).jpg",
  "tbilisoba": "File:Tbilisoba 2013.jpg",
  "bohemian-carnevale": "File:Masopust Praha 2011.jpg",
  "braderie-de-lille": "File:Braderie de Lille 2012.jpg",
  "fetes-de-bayonne": "File:Fêtes de Bayonne 2012.jpg",
  "fiesta-de-san-isidro": "File:Fiestas de San Isidro (Madrid) 2012.jpg",
  "fire-festivals-of-the-pyrenees": "File:Falles d'Isil 2012.jpg",
  "lajkonik-parade": "File:Lajkonik in Kraków.jpg",
  "maastricht-carnival": "File:Carnaval Maastricht 2011.jpg",
  "ommegang-festival": "File:Ommegang 2012 Brussels.jpg",
  "perchtenlauf-salzburg": "File:Perchtenlauf Golling 2013.jpg",
  "pierogi-festival": "File:Festival Pierogów Kraków.jpg",
  "romaria-de-viana-do-castelo": "File:Romaria da Senhora da Agonia 2013.jpg",
  "saint-lucia-festival": "File:Festa di Santa Lucia Siracusa.jpg",
  "santos-populares-lisbon": "File:Santos Populares Lisboa 2012.jpg",
  "schaferlauf-markgroningen": "File:Schäferlauf Markgröningen 2012.jpg",
  "st-dominic-s-fair": "File:St. Dominic's Fair in Gdańsk.jpg",
  "thorrablot-reykjavik": "File:Þorrablót (Iceland).jpg",
  "valkenburg-christmas-markets": "File:Kerstmarkt Valkenburg aan de Geul.jpg",
  "festa-della-sensa": "File:Festa della Sensa Venezia.jpg",
  "olsok-trondheim": "File:St. Olav Festival Trondheim.jpg",
  "nadur-carnival-gozo": "File:Nadur Carnival.jpg",
  "kotor-carnival": "File:Kotor Carnival.jpg"
};

const WIKI_TITLES = {
  "el-colacho": "Baby jumping",
  "apokries-carnival": "Patras Carnival",
  "jani-festival": "Jāņi",
  "festa-frawli": "Strawberry festival",
  "saint-lucia-festival": "Feast of Saint Lucy",
  "holy-week-braga": "Holy Week in Braga",
  "romeria-del-rocio": "Romería de El Rocío",
  "isle-of-man-tt": "Isle of Man TT",
  "coachella": "Coachella Valley Music and Arts Festival",
  "hogmanay": "Hogmanay",
  "mardi-gras-new-orleans": "Mardi Gras in New Orleans",
  "songkran": "Songkran (Thailand)",
  "regata-storica": "Regata Storica",
  "luminara-di-san-ranieri": "Luminara di San Ranieri",
  "viareggio-carnival": "Carnival of Viareggio",
  "scarlet-sails": "Scarlet Sails (festival)",
  "holi-festival-mathura": "Holi",
  "pukkelpop": "Pukkelpop",
  "untold-festival": "Untold Festival",
  "electric-castle-festival": "Electric Castle",
  "flow-festival-helsinki": "Flow Festival",
  "hay-festival-hay-on-wye": "Hay Festival",
  "umbria-jazz-festival": "Umbria Jazz Festival",
  "tbilisoba": "Tbilisoba",
  "bohemian-carnevale": "Masopust",
  "braderie-de-lille": "Braderie de Lille",
  "fetes-de-bayonne": "Fêtes de Bayonne",
  "fiesta-de-san-isidro": "Fiestas de San Isidro",
  "fire-festivals-of-the-pyrenees": "Falles (festival)",
  "lajkonik-parade": "Lajkonik",
  "maastricht-carnival": "Carnival of Maastricht",
  "ommegang-festival": "Ommegang",
  "perchtenlauf-salzburg": "Perchten",
  "pierogi-festival": "Pierogi",
  "romaria-de-viana-do-castelo": "Nossa Senhora da Agonia Festival",
  "santos-populares-lisbon": "Santos Populares",
  "schaferlauf-markgroningen": "Schäferlauf",
  "st-dominic-s-fair": "St. Dominic's Fair",
  "thorrablot-reykjavik": "Þorrablót",
  "valkenburg-christmas-markets": "Valkenburg aan de Geul",
  "festa-della-sensa": "Festa della Sensa",
  "olsok-trondheim": "Olsok",
  "nadur-carnival-gozo": "Nadur",
  "la-tomatina": "La Tomatina",
  "malta-international-fireworks-festival": "Malta International Fireworks Festival",
  "isle-of-mtv-malta": "Isle of MTV",
  "mosta-assumption-feast": "Mosta",
  "feast-of-st-george-victoria-gozo": "Victoria, Gozo",
  "feast-of-st-paul-s-shipwreck": "Feast of Saint Paul (Valletta)",
  "festa-san-filep-zebbug-gozo": "Żebbuġ, Gozo",
  "festa-frawli": "Mġarr",
  "santa-marija-feast-victoria-gozo": "Victoria, Gozo"
};

function parseDataFile(relPath) {
  const text = fs.readFileSync(join(root, relPath), "utf8");
  const out = [];
  const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}(?=\s*,|\s*\n)/g;
  let m;
  while ((m = re.exec(text))) {
    const block = m[0];
    out.push({
      id: m[1],
      name: block.match(/name:\s*"([^"]*)"/)?.[1] ?? m[1],
      city: block.match(/city:\s*"([^"]*)"/)?.[1] ?? "",
      country: block.match(/country:\s*"([^"]*)"/)?.[1] ?? ""
    });
  }
  return out;
}

function stripQualifier(name) {
  const idx = name.indexOf("—");
  return idx >= 0 ? name.slice(0, idx).trim() : name;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function imageInfoForTitle(fileTitle) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=imageinfo&iiurlwidth=1200&iiprop=url|extmetadata" +
    `&titles=${encodeURIComponent(fileTitle)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const j = await res.json();
  const page = Object.values(j.query?.pages ?? {})[0];
  if (page?.missing !== undefined) return null;
  const ii = page?.imageinfo?.[0];
  if (!ii?.url) return null;
  const mime = ii.extmetadata?.MIME_type?.value ?? "";
  if (/svg|webm|gif/i.test(mime)) return null;
  return { title: fileTitle, url: ii.url };
}

async function commonsSearch(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&list=search&srnamespace=6&srlimit=15" +
    `&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.query?.search ?? []).map((s) => s.title);
}

async function wikipediaPageImage(articleTitle) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=pageimages&piprop=thumbnail|original&pithumbsize=1400" +
    `&titles=${encodeURIComponent(articleTitle)}&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const j = await res.json();
  const page = Object.values(j.query?.pages ?? {})[0];
  const src = page?.original?.source || page?.thumbnail?.source;
  if (!src || !/\.(jpe?g|png|webp)(\?|$)/i.test(src)) return null;
  return { title: articleTitle, url: src, source: "wikipedia" };
}

function scoreTitle(title, f) {
  const t = title.toLowerCase();
  const name = stripQualifier(f.name).toLowerCase();
  const city = f.city.toLowerCase();
  const country = f.country.toLowerCase();
  let score = 0;
  if (t.includes(name.split(" ")[0]) && name.length > 3) score += 3;
  if (city && t.includes(city)) score += 4;
  if (country && t.includes(country)) score += 2;
  if (/festival|carnival|carnaval|festa|fiesta|parade|fête/i.test(t)) score += 2;
  if (/logo|icon|map|flag|coat of arms|svg/i.test(t)) score -= 10;
  if (/portrait|headshot|actor|actress/i.test(t)) score -= 5;
  return score;
}

async function resolveOne(f) {
  if (KNOWN_GOOD[f.id]) {
    const hit = await imageInfoForTitle(KNOWN_GOOD[f.id]);
    if (hit) return { ...hit, source: "known" };
  }

  const wiki = WIKI_TITLES[f.id];
  if (wiki) {
    const hit = await wikipediaPageImage(wiki);
    if (hit) return hit;
  }

  const base = stripQualifier(f.name);
  const queries = [
    `${base} ${f.city}`,
    `${base} ${f.country}`,
    `${base} festival`,
    `${f.city} ${base}`,
    base,
    f.id.replace(/-/g, " ")
  ];

  let best = null;
  let bestScore = -999;
  for (const q of queries) {
    const titles = await commonsSearch(q);
    await sleep(350);
    for (const title of titles) {
      if (!/\.(jpe?g|png|webp)/i.test(title)) continue;
      const info = await imageInfoForTitle(title);
      await sleep(250);
      if (!info) continue;
      const s = scoreTitle(title, f);
      if (s > bestScore) {
        bestScore = s;
        best = { ...info, source: `search:${q}`, score: s };
      }
    }
    if (bestScore >= 6) break;
  }
  return best;
}

async function main() {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const failedIds = report.details.failed.map((x) => x.id);
  const byId = new Map();
  for (const f of [...parseDataFile("src/data/festivals.ts"), ...parseDataFile("src/data/festivals-more.ts")]) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }

  const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
  const filesById = { ...(overrides.filesById ?? {}) };
  const wikipediaTitleById = { ...(overrides.wikipediaTitleById ?? {}) };

  const resolved = [];
  const stillFailed = [];

  for (let i = 0; i < failedIds.length; i++) {
    const id = failedIds[i];
    const f = byId.get(id);
    if (!f) continue;
    process.stdout.write(`\r[${i + 1}/${failedIds.length}] ${id}`.padEnd(55));
    try {
      const hit = await resolveOne(f);
      await sleep(400);
      if (hit) {
        filesById[id] = hit.title.startsWith("File:") ? hit.title : `File:${hit.title}`;
        if (WIKI_TITLES[id] && hit.source === "wikipedia") {
          wikipediaTitleById[id] = WIKI_TITLES[id];
        }
        resolved.push({ id, title: filesById[id], source: hit.source, score: hit.score });
      } else {
        stillFailed.push(id);
      }
    } catch (e) {
      stillFailed.push(id);
    }
  }

  overrides.filesById = filesById;
  overrides.wikipediaTitleById = wikipediaTitleById;
  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2) + "\n", "utf8");

  const outReport = join(root, "src", "data", "festival-media-batch-resolve.json");
  fs.writeFileSync(
    outReport,
    JSON.stringify({ generatedAt: new Date().toISOString(), resolved, stillFailed }, null, 2),
    "utf8"
  );

  console.log(`\nResolved: ${resolved.length}, still failed: ${stillFailed.length}`);
  console.log("Updated:", overridesPath);
  console.log("Report:", outReport);
  if (stillFailed.length) console.log("Still failed:", stillFailed.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
