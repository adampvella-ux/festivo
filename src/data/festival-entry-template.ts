import type { Festival } from "@/types/festival";

// Copy this object into festivals.ts and replace values.
export const festivalEntryTemplate: Festival = {
  id: "unique-id-slug",
  slug: "unique-id-slug",
  name: "Festival Name",
  description: "1-2 sentence overview of why this event matters.",
  city: "City",
  country: "Country",
  continent: "Continent",
  latitude: 0,
  longitude: 0,
  startDate: "2026-01-01",
  endDate: "2026-01-03",
  eventTypes: ["cultural_heritage"],
  imageUrl: "https://images.unsplash.com/photo-example",
  partyEnergy: 3,
  visualSpectacle: 4,
  culturalDepth: 5,
  tourismDensity: 4,
  bestFor: ["Photography", "Culture", "Nightlife"],
  travelNotes: "Optional travel planning note.",
  officialWebsite: "https://example.com"
};
