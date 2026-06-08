import type { Festival, FestivalType } from "@/types/festival";

const ENERGY = ["Quiet pulse", "Easygoing", "Social buzz", "High energy", "Pure voltage"] as const;
const CULTURE = ["Light touch", "Heritage hints", "Story-rich", "Cultural heavyweight", "Living tradition"] as const;
const TOURISM = ["Hidden gem", "Local scene", "Balanced", "Visitor magnet", "Global spotlight"] as const;
const VISUAL = ["Low-key", "Some show", "Eye-catching", "Full spectacle", "Total sensory overload"] as const;

function tierLabel(n: number, scale: readonly string[]): string {
  const i = Math.min(4, Math.max(0, Math.round(n) - 1));
  return scale[i] ?? scale[2];
}

export type PulseBreakdownRow = {
  key: string;
  score: number;
  label: string;
  flair: string;
};

export function pulseBreakdown(f: Festival): PulseBreakdownRow[] {
  return [
    { key: "energy", score: f.partyEnergy, label: "Energy", flair: tierLabel(f.partyEnergy, ENERGY) },
    { key: "culture", score: f.culturalDepth, label: "Culture", flair: tierLabel(f.culturalDepth, CULTURE) },
    { key: "tourism", score: f.tourismDensity, label: "Tourism density", flair: tierLabel(f.tourismDensity, TOURISM) },
    {
      key: "visual",
      score: f.visualSpectacle,
      label: "Visual spectacle",
      flair: tierLabel(f.visualSpectacle, VISUAL)
    }
  ];
}

const TYPE_TAGLINES: Partial<Record<FestivalType, string[]>> = {
  music: [
    "Where the night turns into one long encore.",
    "Sound, sweat, and skyline in the same breath.",
    "Bass lines drawn across the map."
  ],
  carnival_parade: [
    "Masks, drums, and streets that forget their name.",
    "Color first, sleep later.",
    "A moving museum with confetti for walls."
  ],
  arts: [
    "Curated chaos for curious eyes.",
    "The city becomes a stage.",
    "Where ideas dress up and go out."
  ],
  food_drink: [
    "Flavor as the main event.",
    "Tables long enough for strangers to become friends.",
    "Taste memories you’ll chase home."
  ],
  religious_spiritual: [
    "Candles, bells, and centuries in step.",
    "Faith made visible in procession and song.",
    "Sacred rhythm in ordinary streets."
  ],
  seasonal: [
    "The year turns here first.",
    "Seasons marked the old way—together.",
    "Fire, light, or frost—celebration fits the calendar."
  ],
  cultural_heritage: [
    "Tradition with the volume turned up.",
    "Roots you can still dance on.",
    "Heritage that refuses to be a museum piece."
  ],
  historical: [
    "History you can walk inside.",
    "The past, loud enough to feel.",
    "Stories etched in stone and crowd."
  ],
  civic_national_holiday: [
    "A whole city on the same heartbeat.",
    "Flags, fireworks, and shared pride.",
    "National myth, street-level real."
  ]
};

function hashPick(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return mod ? h % mod : 0;
}

/** Short emotional line for cards — deterministic from festival fields (no new seed data). */
export function festivalTagline(f: Festival): string {
  const primary = f.eventTypes[0];
  const pool = (primary && TYPE_TAGLINES[primary]) || [
    "A constellation moment on the festival map.",
    "Where strangers sync to the same drum.",
    "One city, one weekend, impossible to repeat."
  ];
  const pick = pool[hashPick(f.id, pool.length)] ?? pool[0];
  if (f.partyEnergy >= 4 && !pick.includes("night") && primary === "music") {
    return "Where the night turns into one long encore.";
  }
  return pick;
}
