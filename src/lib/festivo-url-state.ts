import type { BestForTag, FestivoFilters, ScoreLens } from "@/types/festival";
import { BEST_FOR_TAGS } from "@/types/festival";

const LENSES: ScoreLens[] = ["partyEnergy", "visualSpectacle", "culturalDepth", "tourismDensity"];

function isLens(s: string): s is ScoreLens {
  return LENSES.includes(s as ScoreLens);
}

function isBestFor(s: string): s is BestForTag {
  return (BEST_FOR_TAGS as readonly string[]).includes(s);
}

/** Short query keys for shareable URLs. */
export function filtersToSearchParams(filters: FestivoFilters): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("c", filters.continent);
  sp.set("t", filters.eventType);
  sp.set("l", filters.lenses[0] ?? "tourismDensity");
  sp.set("b", filters.bestForTag);
  sp.set("d", filters.datePreset);
  if (filters.datePreset === "custom" && filters.customRangeStart && filters.customRangeEnd) {
    sp.set("from", filters.customRangeStart);
    sp.set("to", filters.customRangeEnd);
  }
  return sp;
}

export function parseFiltersFromSearchParams(
  sp: URLSearchParams,
  defaults: FestivoFilters
): FestivoFilters {
  const c = sp.get("c") ?? sp.get("continent");
  const t = sp.get("t") ?? sp.get("type");
  const l = sp.get("l") ?? sp.get("lens");
  const b = sp.get("b") ?? sp.get("best");
  const d = sp.get("d") ?? sp.get("date");

  const continent = c && c !== "" ? c : defaults.continent;
  const eventType =
    !t || t === "any" ? defaults.eventType : (t as FestivoFilters["eventType"]);
  const lens = l && isLens(l) ? l : defaults.lenses[0] ?? "tourismDensity";
  const bestForTag =
    !b || b === "any" ? defaults.bestForTag : isBestFor(b) ? b : defaults.bestForTag;
  const datePreset =
    d === "next_30" || d === "next_60" || d === "next_90" || d === "any" || d === "custom"
      ? d
      : defaults.datePreset;

  const next: FestivoFilters = {
    ...defaults,
    continent,
    eventType,
    lenses: [lens],
    bestForTag,
    datePreset
  };

  const from = sp.get("from");
  const to = sp.get("to");
  if (datePreset === "custom" && from && to) {
    next.customRangeStart = from;
    next.customRangeEnd = to;
  }
  return next;
}

export function buildFestivoShareUrl(
  pathname: string,
  filters: FestivoFilters,
  opts?: { festivalId?: string | null; compareIds?: string[] }
): string {
  const sp = filtersToSearchParams(filters);
  if (opts?.festivalId) sp.set("f", opts.festivalId);
  if (opts?.compareIds?.length) sp.set("cmp", opts.compareIds.slice(0, 3).join(","));
  const q = sp.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function parseFestivalIdFromSearchParams(sp: URLSearchParams): string | null {
  return sp.get("f") || sp.get("festival");
}

export function parseCompareIdsFromSearchParams(sp: URLSearchParams): string[] {
  const raw = sp.get("cmp") || sp.get("compare");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}
