import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gen = fs.readFileSync(join(root, "src/data/festival-media.generated.ts"), "utf8");
const start = gen.indexOf("{", gen.indexOf("FESTIVAL_MEDIA_GENERATED"));
const end = gen.lastIndexOf("};");
const media = JSON.parse(gen.slice(start, end + 1));
const manual = fs.readFileSync(join(root, "src/data/festival-media-manual.ts"), "utf8");
const manualIds = [...manual.matchAll(/"([a-z0-9-]+)":\s*\{/g)].map((m) => m[1]);
const unsplash = [];
const wiki = [];
for (const [id, b] of Object.entries(media)) {
  if (/unsplash/i.test(b.imageUrl)) unsplash.push(id);
  else wiki.push(id);
}
const unsplashNoManual = unsplash.filter((id) => !manualIds.includes(id));
console.log("Total festivals:", Object.keys(media).length);
console.log("Unsplash in generated:", unsplash.length);
console.log("Wikimedia in generated:", wiki.length);
console.log("Unsplash without manual override:", unsplashNoManual.length);
console.log(unsplashNoManual.join("\n"));
fs.writeFileSync(
  join(root, "src/data/festival-media-thematic-fallbacks.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: "Festivals on Unsplash in generated media without a manual override.",
    count: unsplashNoManual.length,
    ids: unsplashNoManual.sort()
  }, null, 2),
  "utf8"
);
