import type { BestForTag, Festival, FestivoFilters, ScoreLens } from "@/types/festival";

const DAY_MS = 24 * 60 * 60 * 1000;

const BEST_FOR_ALIAS_MAP: Record<string, BestForTag> = {
  "nightlife": "Nightlife",
  "pub culture": "Nightlife",
  "big social energy": "Street celebrations",
  "photography": "Photography",
  "visual spectacle": "Photography",
  "cultural immersion": "Cultural immersion",
  "traditional heritage": "Traditional heritage",
  "religious heritage": "Religious significance",
  "sacred traditions": "Religious significance",
  "street rituals": "Traditional heritage",
  "music lovers": "Music lovers",
  "edm fans": "Music lovers",
  "live brass music": "Music lovers",
  "food travel": "Food travel",
  "beer culture": "Food travel",
  "family travel": "Family-friendly",
  "adrenaline": "Adrenaline seekers",
  "fun chaos": "Adrenaline seekers",
  "group travel": "Group trips",
  "group trips": "Group trips",
  "friends trip": "Group trips",
  "local authenticity": "Local authenticity",
  "authentic rituals": "Local authenticity",
  "street celebrations": "Street celebrations",
  "street energy": "Street celebrations",
  "street dance": "Street celebrations",
  "art and design": "Art and design",
  "light art": "Art and design",
  "festival production": "Art and design",
  "winter city breaks": "Winter travel",
  "winter travel": "Winter travel",
  "summer travel": "Summer travel",
  "late-summer trips": "Summer travel",
  "one-day thrill": "Weekend getaway",
  "mediterranean city breaks": "Weekend getaway"
};

function parseYmd(ymd: string): Date | null {
  const d = new Date(ymd + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getDateWindow(filters: FestivoFilters) {
  const preset = filters.datePreset;

  if (preset === "custom" && filters.customRangeStart && filters.customRangeEnd) {
    let start = parseYmd(filters.customRangeStart);
    let end = parseYmd(filters.customRangeEnd);
    if (start && end) {
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (preset === "next_30") {
    end.setTime(start.getTime() + 30 * DAY_MS);
    return { start, end };
  }

  if (preset === "next_60") {
    end.setTime(start.getTime() + 60 * DAY_MS);
    return { start, end };
  }

  if (preset === "next_90") {
    end.setTime(start.getTime() + 90 * DAY_MS);
    return { start, end };
  }

  if (preset === "custom") {
    end.setTime(start.getTime() + 90 * DAY_MS);
    return { start, end };
  }

  // "any" date window
  end.setFullYear(end.getFullYear() + 5);
  return { start, end };
}

export function scoreFestival(festival: Festival, lenses: ScoreLens[]) {
  const active = lenses.length ? lenses : (["tourismDensity"] as ScoreLens[]);
  const total = active.reduce((acc, lens) => acc + festival[lens], 0);
  return Number((total / active.length).toFixed(2));
}

export function normalizeBestForTags(tags: string[]): BestForTag[] {
  const normalized = tags
    .map((tag) => BEST_FOR_ALIAS_MAP[tag.trim().toLowerCase()])
    .filter((tag): tag is BestForTag => Boolean(tag));
  return Array.from(new Set(normalized));
}

export function filterAndRankFestivals(allFestivals: Festival[], filters: FestivoFilters) {
  const { start, end } = getDateWindow(filters);
  return allFestivals
    .filter((festival) => {
      const startDate = new Date(festival.startDate);
      const endDate = new Date(festival.endDate);
      const overlaps = startDate <= end && endDate >= start;
      const continentMatches = filters.continent === "any" || festival.continent === filters.continent;
      const typeMatches = filters.eventType === "any" || festival.eventTypes.includes(filters.eventType);
      const normalizedBestFor = normalizeBestForTags(festival.bestFor);
      const bestForMatches =
        filters.bestForTag === "any" || normalizedBestFor.includes(filters.bestForTag);
      return overlaps && continentMatches && typeMatches && bestForMatches;
    })
    .map((festival) => ({
      festival,
      score: scoreFestival(festival, filters.lenses)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.festival.startDate).getTime() - new Date(b.festival.startDate).getTime();
    });
}
