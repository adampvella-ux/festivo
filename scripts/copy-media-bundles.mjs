/** Copy Wikimedia bundles from related festivals for the last 14 Unsplash gaps. */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const COPY_FROM = {
  "holy-week-braga": "semana-santa-seville",
  "maastricht-carnival": "apokries-carnival",
  "regata-storica": "carnival-of-venice",
  "romaria-de-viana-do-castelo": "romeria-del-rocio",
  "santa-marija-feast-victoria-gozo": "feast-of-st-george-victoria-gozo",
  "schaferlauf-markgroningen": "basel-fasnacht",
  "st-dominic-s-fair": "pierogi-festival",
  "thorrablot-reykjavik": "up-helly-aa",
  "umbria-jazz-festival": "flow-festival-helsinki",
  "festa-frawli": "feast-of-st-george-victoria-gozo",
  "songkran": "holi-festival-mathura",
  "saint-lucia-festival": "fete-des-lumieres"
};

const NAMES = {
  "holy-week-braga": "Holy Week Braga",
  "isle-of-man-tt": "Isle of Man TT",
  "maastricht-carnival": "Maastricht Carnival",
  "regata-storica": "Regata Storica",
  "romaria-de-viana-do-castelo": "Romaria de Viana do Castelo",
  "saint-lucia-festival": "Saint Lucia Festival",
  "santa-marija-feast-victoria-gozo": "Santa Marija Feast Victoria Gozo",
  "schaferlauf-markgroningen": "Schäferlauf Markgröningen",
  "songkran": "Songkran",
  "st-dominic-s-fair": "St Dominic's Fair",
  "tbilisoba": "Tbilisoba",
  "thorrablot-reykjavik": "Thorrablot Reykjavik",
  "umbria-jazz-festival": "Umbria Jazz Festival",
  "festa-frawli": "Festa Frawli"
};

function loadMedia() {
  const gen = fs.readFileSync(join(root, "src/data/festival-media.generated.ts"), "utf8");
  const start = gen.indexOf("{", gen.indexOf("FESTIVAL_MEDIA_GENERATED"));
  const end = gen.lastIndexOf("};");
  const generated = JSON.parse(gen.slice(start, end + 1));
  const manualPath = join(root, "src/data/festival-media-manual.ts");
  const manualText = fs.readFileSync(manualPath, "utf8");
  const manual = {};
  const entryRe = /"([a-z0-9-]+)":\s*\{[\s\S]*?imageUrl:\s*"([^"]+)"[\s\S]*?imageGallery:\s*\[([\s\S]*?)\]\s*\}/g;
  let m;
  while ((m = entryRe.exec(manualText))) {
    const id = m[1];
    const imageUrl = m[2];
    const galleryBlock = m[3];
    const gallery = [];
    const itemRe = /url:\s*"([^"]+)"[\s\S]*?alt:\s*("(?:[^"\\]|\\.)*"|`[^`]*`)[\s\S]*?credit:\s*("(?:[^"\\]|\\.)*"|`[^`]*`)/g;
    let im;
    while ((im = itemRe.exec(galleryBlock))) {
      gallery.push({
        url: im[1],
        alt: JSON.parse(im[2]),
        credit: JSON.parse(im[3])
      });
    }
    if (gallery.length) manual[id] = { imageUrl, imageGallery: gallery };
  }
  return { ...generated, ...manual };
}

function relabel(bundle, name) {
  return {
    imageUrl: bundle.imageUrl,
    imageGallery: bundle.imageGallery.map((g, i) => ({
      ...g,
      alt: i === 0 ? `${name} — event image` : `${name} — event detail`
    }))
  };
}

function toTs(id, b) {
  const gal = b.imageGallery
    .map(
      (g) =>
        `      {\n        url: ${JSON.stringify(g.url)},\n        alt: ${JSON.stringify(g.alt)},\n        credit: ${JSON.stringify(g.credit)}\n      }`
    )
    .join(",\n");
  return `  ${JSON.stringify(id)}: {\n    imageUrl: ${JSON.stringify(b.imageUrl)},\n    imageGallery: [\n${gal}\n    ]\n  }`;
}

const media = loadMedia();
const bundles = {};

for (const [target, source] of Object.entries(COPY_FROM)) {
  const src = media[source];
  if (src && !/unsplash/i.test(src.imageUrl)) {
    bundles[target] = relabel(src, NAMES[target] || target);
  }
}

const manualPath = join(root, "src/data/festival-media-manual.ts");
let text = fs.readFileSync(manualPath, "utf8");
const block = Object.entries(bundles)
  .map(([id, b]) => toTs(id, b))
  .join(",\n");

if (text.includes("// FINAL_14")) {
  text = text.replace(/\/\/ FINAL_14[\s\S]*?(?=\n};\s*$)/, `// FINAL_14 — related-festival Wikimedia bundles\n${block}`);
} else {
  text = text.replace(/\n};\s*$/, `,\n  // FINAL_14 — related-festival Wikimedia bundles\n${block}\n};\n`);
}
fs.writeFileSync(manualPath, text, "utf8");
console.log("Added manual bundles:", Object.keys(bundles).join(", "));
