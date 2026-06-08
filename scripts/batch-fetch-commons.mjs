/**
 * Fetches Wikimedia image URLs for many files in one API call, then patches
 * festival-media-manual.ts entries for festivals still on Unsplash.
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const UA = "FestivoWeb/1.0 (batch fetch)";

const FILES_BY_ID = {
  "la-tomatina": "File:Tomatina 2006.jpg",
  "romeria-del-rocio": "File:Romeria del Rocio Santa Coloma.jpg",
  "hogmanay": "File:Edinburgh Hogmanay 2012-2013 fireworks.jpg",
  "mardi-gras-new-orleans": "File:Mardi Gras 2014 New Orleans 1.jpg",
  "songkran": "File:Songkran Chiang Mai.jpg",
  "regata-storica": "File:Regata Storica 2008.jpg",
  "scarlet-sails": "File:Scarlet Sails 2014 in Saint Petersburg.jpg",
  "holi-festival-mathura": "File:Holi Festival of Colors Utah, United States 2013.jpg",
  "isle-of-man-tt": "File:TT Race Start.jpg",
  "pukkelpop": "File:Pukkelpop 2012.jpg",
  "flow-festival-helsinki": "File:Flow Festival 2012.jpg",
  "hay-festival-hay-on-wye": "File:Hay Festival 2013.jpg",
  "umbria-jazz-festival": "File:Umbria Jazz 2011.jpg",
  "holy-week-braga": "File:Semana Santa Braga 2012 (2).jpg",
  "tbilisoba": "File:Tbilisoba 2013.jpg",
  "bohemian-carnevale": "File:Masopust Praha 2011.jpg",
  "fire-festivals-of-the-pyrenees": "File:Falles d'Isil 2012.jpg",
  "maastricht-carnival": "File:Carnaval Maastricht 2011.jpg",
  "romaria-de-viana-do-castelo": "File:Romaria da Senhora da Agonia 2013.jpg",
  "saint-lucia-festival": "File:Festa di Santa Lucia Siracusa.jpg",
  "schaferlauf-markgroningen": "File:Schäferlauf Markgröningen 2012.jpg",
  "st-dominic-s-fair": "File:St. Dominic's Fair in Gdańsk.jpg",
  "thorrablot-reykjavik": "File:Þorrablót (Iceland).jpg",
  "lajkonik-parade": "File:Lajkonik in Kraków.jpg",
  "luminara-di-san-ranieri":
    "File:Pisa, luminara di san ranieri, 2022, lungarno gambacorti, santa maria della spina 03.jpg",
  "santos-populares-lisbon":
    "File:Street decorations up for Santos Populares (Popular Saints Festival) in Lisbon, Portugal (55181046951).jpg",
  "festa-della-sensa": "File:Festa della Sensa Venezia.jpg",
  "malta-international-fireworks-festival": "File:Malta fireworks festival.jpg",
  "feast-of-st-paul-s-shipwreck": "File:Valletta feast of St Paul fireworks.jpg",
  "feast-of-st-george-victoria-gozo": "File:Victoria Gozo festa fireworks.jpg",
  "festa-frawli": "File:Strawberry festival Mgarr Malta.jpg",
  "festa-san-filep-zebbug-gozo": "File:Zebbug Gozo festa.jpg",
  "santa-marija-feast-victoria-gozo": "File:Victoria Gozo festa.jpg",
  "mosta-assumption-feast": "File:Mosta dome festa fireworks.jpg",
  "isle-of-mtv-malta": "File:Isle of MTV Malta 2012.jpg"
};

function parseNames() {
  const names = {};
  for (const rel of ["src/data/festivals.ts", "src/data/festivals-more.ts"]) {
    const text = fs.readFileSync(join(root, rel), "utf8");
    const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*name:\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(text))) names[m[1]] = m[2];
  }
  return names;
}

async function batchImageInfo(titles) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=imageinfo&iiurlwidth=1280&iiprop=url|extmetadata" +
    `&titles=${titles.map((t) => encodeURIComponent(t)).join("|")}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const txt = await res.text();
  if (txt.startsWith("You are")) throw new Error("Rate limited");
  const j = JSON.parse(txt);
  const out = new Map();
  for (const page of Object.values(j.query?.pages ?? {})) {
    if (page.missing !== undefined) continue;
    const ii = page.imageinfo?.[0];
    if (!ii?.url) continue;
    const ext = ii.extmetadata ?? {};
    const artist = (ext.Artist?.value || ext.Credit?.value || "")
      .replace(/<[^>]+>/g, "")
      .trim();
    const license = (ext.LicenseShortName?.value || "Wikimedia Commons")
      .replace(/<[^>]+>/g, "")
      .trim();
    out.set(page.title, {
      thumb: ii.thumburl || ii.url,
      full: ii.url,
      credit: artist ? `${artist} · Wikimedia Commons · ${license}` : `Wikimedia Commons · ${license}`
    });
  }
  return out;
}

function bundle(id, name, info) {
  return {
    imageUrl: info.thumb,
    imageGallery: [
      { url: info.full, alt: `${name} — event image`, credit: info.credit },
      { url: info.thumb, alt: `${name} — event detail`, credit: info.credit }
    ]
  };
}

async function main() {
  const names = parseNames();
  const fallbackIds = JSON.parse(
    fs.readFileSync(join(root, "src/data/festival-media-thematic-fallbacks.json"), "utf8")
  ).ids;

  const toResolve = fallbackIds.filter((id) => FILES_BY_ID[id]);
  const titles = [...new Set(toResolve.map((id) => FILES_BY_ID[id]))];
  const infoMap = await batchImageInfo(titles);

  const resolved = {};
  const missing = [];
  for (const id of toResolve) {
    const title = FILES_BY_ID[id];
    const info = infoMap.get(title);
    if (info) resolved[id] = bundle(id, names[id] || id, info);
    else missing.push({ id, title });
  }

  // Patch generated media too
  const genPath = join(root, "src/data/festival-media.generated.ts");
  const genText = fs.readFileSync(genPath, "utf8");
  const start = genText.indexOf("{", genText.indexOf("FESTIVAL_MEDIA_GENERATED"));
  const end = genText.lastIndexOf("};");
  const media = JSON.parse(genText.slice(start, end + 1));
  for (const [id, b] of Object.entries(resolved)) media[id] = b;

  const genOut = `import type { FestivalGalleryImage } from "@/types/festival";

export type FestivalMediaBundle = {
  imageUrl: string;
  imageGallery: FestivalGalleryImage[];
};

/** Auto-generated by scripts/build-festival-media.mjs — do not edit by hand. */
export const FESTIVAL_MEDIA_GENERATED: Record<string, FestivalMediaBundle> = ${JSON.stringify(media, null, 2)};
`;
  fs.writeFileSync(genPath, genOut, "utf8");

  // Merge into manual overrides (manual wins in app)
  const manualPath = join(root, "src/data/festival-media-manual.ts");
  let manualText = fs.readFileSync(manualPath, "utf8");
  const entries = Object.entries(resolved)
    .map(([id, b]) => {
      const gal = b.imageGallery
        .map(
          (g) =>
            `      {\n        url: "${g.url}",\n        alt: ${JSON.stringify(g.alt)},\n        credit: ${JSON.stringify(g.credit)}\n      }`
        )
        .join(",\n");
      return `  "${id}": {\n    imageUrl: "${b.imageUrl}",\n    imageGallery: [\n${gal}\n    ]\n  }`;
    })
    .join(",\n");

  if (manualText.includes("// BATCH_RESOLVED")) {
    manualText = manualText.replace(
      /\/\/ BATCH_RESOLVED[\s\S]*?(?=\n};\s*$)/,
      `// BATCH_RESOLVED — Wikimedia-verified festival photos\n${entries}`
    );
  } else {
    manualText = manualText.replace(
      /};\s*$/,
      `,\n  // BATCH_RESOLVED — Wikimedia-verified festival photos\n${entries}\n};\n`
    );
  }
  fs.writeFileSync(manualPath, manualText, "utf8");

  const stillStock = fallbackIds.filter((id) => !resolved[id]);
  fs.writeFileSync(
    join(root, "src/data/festival-media-thematic-fallbacks.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Festivals still using thematic Unsplash.",
        count: stillStock.length,
        ids: stillStock.sort()
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Batch resolved: ${Object.keys(resolved).length}`);
  console.log(`Missing files: ${missing.length}`);
  if (missing.length) console.log(JSON.stringify(missing, null, 2));
  console.log(`Still Unsplash: ${stillStock.length}`, stillStock.join(", "));
}

main().catch(console.error);
