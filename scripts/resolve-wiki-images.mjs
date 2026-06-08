/** Resolve remaining festivals via Wikipedia page image API (lighter than Commons search). */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "FestivoWeb/1.0 (wiki images)";

const WIKI = {
  "festa-frawli": "Strawberry festival",
  "festa-san-filep-zebbug-gozo": "Żebbuġ, Gozo",
  "hay-festival-hay-on-wye": "Hay Festival",
  "hogmanay": "Hogmanay",
  "holy-week-braga": "Holy Week in Braga",
  "isle-of-man-tt": "Isle of Man TT",
  "isle-of-mtv-malta": "Isle of MTV",
  "lajkonik-parade": "Lajkonik",
  "maastricht-carnival": "Carnival of Maastricht",
  "mardi-gras-new-orleans": "Mardi Gras in New Orleans",
  "mosta-assumption-feast": "Mosta",
  "pukkelpop": "Pukkelpop",
  "regata-storica": "Regata Storica",
  "romaria-de-viana-do-castelo": "Nossa Senhora da Agonia Festival",
  "saint-lucia-festival": "Feast of Saint Lucy",
  "santa-marija-feast-victoria-gozo": "Victoria, Gozo",
  "schaferlauf-markgroningen": "Schäferlauf",
  "songkran": "Songkran (Thailand)",
  "st-dominic-s-fair": "St. Dominic's Fair",
  "tbilisoba": "Tbilisoba",
  "thorrablot-reykjavik": "Þorrablót",
  "umbria-jazz-festival": "Umbria Jazz Festival"
};

const names = {};
for (const rel of ["src/data/festivals.ts", "src/data/festivals-more.ts"]) {
  const text = fs.readFileSync(join(root, rel), "utf8");
  const re = /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?\n\s*name:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(text))) names[m[1]] = m[2];
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wikiImage(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=pageimages&piprop=thumbnail|original&pithumbsize=1280" +
    `&titles=${encodeURIComponent(title)}&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const txt = await res.text();
  if (txt.startsWith("You are")) return null;
  const j = JSON.parse(txt);
  const page = Object.values(j.query?.pages ?? {})[0];
  const src = page?.original?.source || page?.thumbnail?.source;
  if (!src || !/\.(jpe?g|png|webp)/i.test(src)) return null;
  return { thumb: page?.thumbnail?.source || src, full: src, credit: `Wikimedia (Wikipedia: ${title})` };
}

async function main() {
  const ids = Object.keys(WIKI);
  const bundles = {};
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`\r[${i + 1}/${ids.length}] ${id}`.padEnd(45));
    await sleep(2500);
    const info = await wikiImage(WIKI[id]);
    if (info) {
      bundles[id] = {
        imageUrl: info.thumb,
        imageGallery: [
          { url: info.full, alt: `${names[id]} — event image`, credit: info.credit },
          { url: info.thumb, alt: `${names[id]} — event detail`, credit: info.credit }
        ]
      };
    } else failed.push(id);
  }

  const manualPath = join(root, "src/data/festival-media-manual.ts");
  let text = fs.readFileSync(manualPath, "utf8");
  const block = Object.entries(bundles)
    .map(([id, b]) => {
      const gal = b.imageGallery
        .map(
          (g) =>
            `      {\n        url: ${JSON.stringify(g.url)},\n        alt: ${JSON.stringify(g.alt)},\n        credit: ${JSON.stringify(g.credit)}\n      }`
        )
        .join(",\n");
      return `  ${JSON.stringify(id)}: {\n    imageUrl: ${JSON.stringify(b.imageUrl)},\n    imageGallery: [\n${gal}\n    ]\n  }`;
    })
    .join(",\n");

  if (text.includes("// WIKI_RESOLVED")) {
    text = text.replace(/\/\/ WIKI_RESOLVED[\s\S]*?(?=\n};\s*$)/, `// WIKI_RESOLVED\n${block}`);
  } else {
    text = text.replace(/\n};\s*$/, `,\n  // WIKI_RESOLVED\n${block}\n};\n`);
  }
  fs.writeFileSync(manualPath, text, "utf8");
  console.log(`\nWiki resolved: ${Object.keys(bundles).length}, failed: ${failed.length}`);
  if (failed.length) console.log(failed.join(", "));
}

main().catch(console.error);
