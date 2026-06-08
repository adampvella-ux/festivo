export type FestivalType =
  | "civic_national_holiday"
  | "religious_spiritual"
  | "historical"
  | "arts"
  | "music"
  | "food_drink"
  | "seasonal"
  | "carnival_parade"
  | "cultural_heritage";

export type ScoreLens = "partyEnergy" | "visualSpectacle" | "culturalDepth" | "tourismDensity";

export const BEST_FOR_TAGS = [
  "Nightlife",
  "Photography",
  "Cultural immersion",
  "Traditional heritage",
  "Religious significance",
  "Music lovers",
  "Food travel",
  "Family-friendly",
  "Luxury travel",
  "Budget-friendly",
  "Adrenaline seekers",
  "Romantic getaway",
  "Group trips",
  "Solo travelers",
  "Local authenticity",
  "Street celebrations",
  "Art and design",
  "Winter travel",
  "Summer travel",
  "Weekend getaway"
] as const;

export type BestForTag = (typeof BEST_FOR_TAGS)[number];

/** Detail overlay: event-sourced photos with licensing credit (e.g. Wikimedia Commons). */
export type FestivalGalleryImage = {
  url: string;
  alt: string;
  credit: string;
};

export type Festival = {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  eventTypes: FestivalType[];
  imageUrl: string;
  /** When set, detail dialog shows these photos (carousel) instead of only imageUrl. */
  imageGallery?: FestivalGalleryImage[];
  partyEnergy: 1 | 2 | 3 | 4 | 5;
  visualSpectacle: 1 | 2 | 3 | 4 | 5;
  culturalDepth: 1 | 2 | 3 | 4 | 5;
  tourismDensity: 1 | 2 | 3 | 4 | 5;
  bestFor: string[];
  travelNotes?: string;
  officialWebsite?: string;
};

export type DatePreset = "next_30" | "next_60" | "next_90" | "any" | "custom";

export type FestivoFilters = {
  continent: string;
  eventType: FestivalType | "any";
  datePreset: DatePreset;
  /** ISO `YYYY-MM-DD` — used when `datePreset === "custom"` */
  customRangeStart?: string;
  customRangeEnd?: string;
  lenses: ScoreLens[];
  bestForTag: BestForTag | "any";
};
