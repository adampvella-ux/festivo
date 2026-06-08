import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "src", "data");
const ideasSrc = fs.readFileSync(join(dataDir, "festival-ideas.ts"), "utf8");
const festSrc =
  fs.readFileSync(join(dataDir, "festivals.ts"), "utf8") +
  fs.readFileSync(join(dataDir, "festivals-more.ts"), "utf8");
const ideaNames = [...ideasSrc.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const existingNames = [...festSrc.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matches(idea, catalogName) {
  const a = norm(idea);
  const b = norm(catalogName);
  if (a === b || b.includes(a) || a.includes(b)) return true;
  const short = idea.split(" ")[0].toLowerCase();
  if (short.length > 4 && catalogName.toLowerCase().includes(short)) return true;
  return false;
}

const missing = ideaNames.filter(
  (idea) => !existingNames.some((n) => matches(idea, n))
);

console.log(JSON.stringify({ ideaCount: ideaNames.length, catalogNames: existingNames.length, missingCount: missing.length, missing }, null, 2));
