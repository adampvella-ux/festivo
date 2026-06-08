"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { festivals } from "@/data/festivals";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { festivalTagline } from "@/lib/festival-pulse-present";
import {
  buildFestivoShareUrl,
  parseCompareIdsFromSearchParams,
  parseFestivalIdFromSearchParams,
  parseFiltersFromSearchParams
} from "@/lib/festivo-url-state";
import { filterAndRankFestivals, normalizeBestForTags } from "@/lib/festival-utils";
import {
  BEST_FOR_TAGS,
  type Festival,
  type FestivalGalleryImage,
  type FestivalType,
  type FestivoFilters,
  type ScoreLens
} from "@/types/festival";
import { MapPanel } from "./map-panel";
import { PulseBreakdownMini } from "./pulse-breakdown";
import { TimeWindowFilter, formatTimeWindowCriteria } from "./time-window-filter";

const defaultLens: ScoreLens = "tourismDensity";

const lensOptions: { id: ScoreLens; label: string; pulseHint: string }[] = [
  { id: "tourismDensity", label: "Tourism density", pulseHint: "Visitor magnet vs hidden gem" },
  { id: "partyEnergy", label: "Party energy", pulseHint: "Nightlife & crowd voltage" },
  { id: "visualSpectacle", label: "Visual spectacle", pulseHint: "Lights, floats, spectacle" },
  { id: "culturalDepth", label: "Cultural depth", pulseHint: "Story, ritual, heritage weight" }
];

const types: FestivalType[] = [
  "civic_national_holiday",
  "religious_spiritual",
  "historical",
  "arts",
  "music",
  "food_drink",
  "seasonal",
  "carnival_parade",
  "cultural_heritage"
];

const defaultFilters: FestivoFilters = {
  continent: "any",
  eventType: "any",
  datePreset: "next_90",
  lenses: [defaultLens],
  bestForTag: "any"
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function toggle<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${start} – ${end}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  if (start === end) return s.toLocaleDateString(undefined, opts);
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

/** Human-readable Refine criteria — drives who appears in the matching set (same rules as `filterAndRankFestivals`). */
function criteriaSummaryLines(filters: FestivoFilters): { label: string; value: string }[] {
  return [
    { label: "Time window", value: formatTimeWindowCriteria(filters) },
    { label: "Continent", value: filters.continent === "any" ? "Any region" : filters.continent },
    {
      label: "Event type",
      value: filters.eventType === "any" ? "Any type" : formatLabel(filters.eventType)
    },
    {
      label: "Best for",
      value: filters.bestForTag === "any" ? "Any traveler goal" : filters.bestForTag
    }
  ];
}

function refineOneLiner(filters: FestivoFilters): string {
  const lens = lensOptions.find((l) => l.id === (filters.lenses[0] ?? defaultLens))?.label ?? "Tourism density";
  return [
    formatTimeWindowCriteria(filters),
    filters.continent === "any" ? "All regions" : filters.continent,
    filters.eventType === "any" ? "Any type" : formatLabel(filters.eventType),
    filters.bestForTag === "any" ? "Any traveler goal" : filters.bestForTag,
    `Pulse: ${lens}`
  ].join(" · ");
}

export function AppShell() {
  const pathname = usePathname();
  const router = useRouter();
  const urlHydrated = useRef(false);
  const [urlReady, setUrlReady] = useState(false);

  const [filters, setFilters] = useState<FestivoFilters>(defaultFilters);
  const [refineOpen, setRefineOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Opened from list/map by reference — no ID lookup failures */
  const [detailFestival, setDetailFestival] = useState<Festival | null>(null);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);
  const [seeAllMatchingOpen, setSeeAllMatchingOpen] = useState(false);
  const saved = useLocalStorage<string[]>("festivo_saved", []);
  const compare = useLocalStorage<string[]>("festivo_compare", []);

  const ranked = useMemo(() => filterAndRankFestivals(festivals, filters), [filters]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label);
    } catch {
      showToast("Could not copy — try selecting the address bar");
    }
  }, [showToast]);

  const shareUrl = useCallback(
    (opts?: { festivalId?: string | null; includeCompare?: boolean }) => {
      const path = pathname || "/";
      const rel = buildFestivoShareUrl(path, filters, {
        festivalId: opts?.festivalId ?? undefined,
        compareIds: opts?.includeCompare ? compare.value : undefined
      });
      if (typeof window === "undefined") return rel;
      return `${window.location.origin}${rel}`;
    },
    [filters, pathname, compare.value]
  );

  useEffect(() => {
    if (urlHydrated.current) return;
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if ([...sp.keys()].length > 0) {
      setFilters(parseFiltersFromSearchParams(sp, defaultFilters));
      const cmp = parseCompareIdsFromSearchParams(sp);
      if (cmp.length) compare.setValue(cmp);
      const fid = parseFestivalIdFromSearchParams(sp);
      if (fid) {
        const hit = festivals.find((x) => x.id === fid);
        if (hit) {
          setDetailFestival(hit);
          setSelectedId(fid);
        }
      }
    }
    urlHydrated.current = true;
    setUrlReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydration from URL
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const path = pathname || "/";
    const rel = buildFestivoShareUrl(path, filters, {
      festivalId: detailFestival?.id ?? null,
      compareIds: compare.value.length ? compare.value : undefined
    });
    router.replace(rel, { scroll: false });
  }, [filters, detailFestival?.id, compare.value, pathname, router, urlReady]);

  const openDetail = useCallback((f: Festival) => {
    setDetailFestival(f);
    setSelectedId(f.id);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailFestival(null);
    setSelectedId(null);
  }, []);

  const handleMapMarkerSelect = useCallback(
    (id: string) => {
      const fromList = festivals.find((item) => item.id === id);
      const fromRanked = ranked.find((r) => r.festival.id === id)?.festival;
      const f = fromList ?? fromRanked;
      if (f) openDetail(f);
    },
    [ranked, openDetail]
  );

  const continents = useMemo(
    () => Array.from(new Set(festivals.map((festival) => festival.continent))).sort(),
    []
  );

  function toggleSaved(id: string) {
    saved.setValue(toggle(saved.value, id));
  }

  function toggleCompare(id: string) {
    if (compare.value.includes(id)) {
      compare.setValue(compare.value.filter((item) => item !== id));
      return;
    }
    if (compare.value.length >= 3) return;
    compare.setValue([...compare.value, id]);
  }

  const activeLens = filters.lenses[0] ?? defaultLens;

  return (
    <>
    <main className="mx-auto min-h-screen max-w-[1600px] p-4 text-slate-100 md:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-cyan-300/90">Festivo Pulse</p>
          <h1 className="bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
            Festivo
          </h1>
          <p className="text-sm text-slate-300">Travel with Purpose</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-cyan-500/25 bg-slate-950/60 px-4 py-2 text-xs text-slate-200">
            <span className="text-slate-500">Saved</span>{" "}
            <span className="font-semibold tabular-nums text-cyan-200">{saved.value.length}</span>
          </div>
          <div className="rounded-full border border-fuchsia-500/20 bg-slate-950/60 px-4 py-2 text-xs text-slate-200">
            <span className="text-slate-500">Compare</span>{" "}
            <span className="font-semibold tabular-nums text-fuchsia-200">{compare.value.length}</span>
            <span className="text-slate-500">/3</span>
          </div>
        </div>
      </header>

      <section className="panel mb-4 rounded-2xl border border-white/[0.06] p-3 md:p-4">
        <button
          type="button"
          onClick={() => setRefineOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-white/[0.03]"
          aria-expanded={refineOpen}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Refine</p>
            <p className="mt-1 truncate text-sm text-slate-200">{refineOneLiner(filters)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Map first — open when you want to tune time, region, or vibe.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border border-slate-600/70 px-2.5 py-1 text-xs font-medium text-slate-300 transition ${
              refineOpen ? "border-cyan-500/40 text-cyan-100" : ""
            }`}
          >
            {refineOpen ? "Hide" : "Edit"}
          </span>
        </button>
        {refineOpen ? (
          <div className="mt-4 space-y-5 border-t border-white/[0.06] pt-4">
            <div>
              <span className="mb-2 block text-xs font-medium text-slate-400">Time window</span>
              <TimeWindowFilter filters={filters} onChange={setFilters} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Rank by (Pulse lens)</span>
                <select
                  value={activeLens}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      lenses: [event.target.value as ScoreLens]
                    }))
                  }
                  className="festivo-select w-full"
                >
                  {lensOptions.map(({ id, label, pulseHint }) => (
                    <option key={id} value={id}>
                      Pulse · {label} — {pulseHint}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Continent</span>
                <select
                  value={filters.continent}
                  onChange={(event) => setFilters((prev) => ({ ...prev, continent: event.target.value }))}
                  className="festivo-select w-full"
                >
                  <option value="any">Any region</option>
                  {continents.map((continent) => (
                    <option key={continent} value={continent}>
                      {continent}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Event type</span>
                <select
                  value={filters.eventType}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, eventType: event.target.value as FestivoFilters["eventType"] }))
                  }
                  className="festivo-select w-full"
                >
                  <option value="any">Any type</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm sm:col-span-2 xl:col-span-1">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Best for</span>
                <select
                  value={filters.bestForTag}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, bestForTag: event.target.value as FestivoFilters["bestForTag"] }))
                  }
                  className="festivo-select w-full"
                >
                  <option value="any">Any traveler goal</option>
                  {BEST_FOR_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText("Link copied — filters saved in URL", shareUrl())}
                className="rounded-lg border border-cyan-500/35 bg-cyan-500/[0.08] px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/15"
              >
                Copy share link (filters)
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(300px,420px)_minmax(0,1.85fr)]">
        <div className="order-1 min-h-0 lg:order-2">
          <MapPanel
            festivals={ranked}
            selectedId={selectedId}
            onSelect={handleMapMarkerSelect}
            activeLens={activeLens}
            lensOptions={lensOptions}
            onLensChange={(lens) =>
              setFilters((prev) => ({
                ...prev,
                lenses: [lens]
              }))
            }
            layoutRevision={refineOpen}
          />
        </div>

        <aside className="order-2 flex min-h-0 flex-col gap-3 lg:order-1">
          <ResultsPanel
            ranked={ranked}
            selectedId={selectedId}
            onSelectFestival={openDetail}
            saved={saved.value}
            compare={compare.value}
            toggleSaved={toggleSaved}
            toggleCompare={toggleCompare}
          />
          <button
            type="button"
            onClick={() => setSeeAllMatchingOpen(true)}
            disabled={ranked.length === 0}
            className="w-full rounded-xl border border-cyan-500/35 bg-cyan-500/[0.06] px-4 py-3 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/12 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            <span className="block">See more</span>
            <span className="mt-0.5 block text-xs font-normal text-cyan-200/60">
              {ranked.length === 0
                ? "No matches for current criteria"
                : `Full list of ${ranked.length} matching festival${ranked.length === 1 ? "" : "s"}`}
            </span>
          </button>
        </aside>
      </section>

      <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center lg:hidden">
        <button
          type="button"
          onClick={() => setMobileResultsOpen(true)}
          className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-100 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] transition hover:bg-cyan-500/20"
        >
          Matching festivals
          <span className="ml-1.5 tabular-nums text-cyan-200/80">({ranked.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSeeAllMatchingOpen(true)}
          disabled={ranked.length === 0}
          className="text-sm font-medium text-cyan-300/90 underline decoration-cyan-500/30 underline-offset-2 disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
        >
          See full list
        </button>
      </div>

      <ComparePanel
        festivals={festivals}
        compareIds={compare.value}
        onToggleCompare={toggleCompare}
        onCopyShareCompare={() =>
          copyText("Link copied — compare tray & filters", shareUrl({ includeCompare: true }))
        }
      />

      <AnimatePresence>
        {mobileResultsOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60 p-3 lg:hidden"
            onClick={() => setMobileResultsOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="panel h-[85vh] overflow-auto rounded-2xl p-4 md:p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Matching</h2>
                <button
                  type="button"
                  onClick={() => setMobileResultsOpen(false)}
                  className="rounded-full border border-slate-600/80 px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  Close
                </button>
              </div>
              <ResultsPanel
                ranked={ranked}
                selectedId={selectedId}
                onSelectFestival={(f) => {
                  openDetail(f);
                  setMobileResultsOpen(false);
                }}
                saved={saved.value}
                compare={compare.value}
                toggleSaved={toggleSaved}
                toggleCompare={toggleCompare}
                embedded
              />
              <button
                type="button"
                onClick={() => {
                  setMobileResultsOpen(false);
                  setSeeAllMatchingOpen(true);
                }}
                disabled={ranked.length === 0}
                className="mt-4 w-full rounded-xl border border-cyan-500/35 bg-cyan-500/[0.08] py-3 text-sm font-medium text-cyan-100 disabled:border-slate-700 disabled:bg-slate-900/50 disabled:text-slate-500"
              >
                See full matching list ({ranked.length})
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>

    {seeAllMatchingOpen ? (
      <AllMatchingFestivalsOverlay
        ranked={ranked}
        filters={filters}
        rankLensLabel={`Pulse · ${lensOptions.find((l) => l.id === activeLens)?.label ?? "Tourism density"}`}
        onClose={() => setSeeAllMatchingOpen(false)}
        onSelectFestival={(f) => {
          openDetail(f);
          setSeeAllMatchingOpen(false);
        }}
        selectedId={selectedId}
        saved={saved.value}
        compare={compare.value}
        toggleSaved={toggleSaved}
        toggleCompare={toggleCompare}
      />
    ) : null}

    {detailFestival ? (
      <FestivalDetailDialog
        key={detailFestival.id}
        festival={detailFestival}
        onClose={closeDetail}
        onSave={() => toggleSaved(detailFestival.id)}
        onCompare={() => toggleCompare(detailFestival.id)}
        onCopyShareLink={() =>
          copyText(
            "Link copied — festival, filters & compare tray",
            shareUrl({ festivalId: detailFestival.id, includeCompare: true })
          )
        }
        saved={saved.value.includes(detailFestival.id)}
        inCompare={compare.value.includes(detailFestival.id)}
      />
    ) : null}

    {toast ? (
      <div
        role="status"
        className="fixed bottom-6 left-1/2 z-[2147483646] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-cyan-500/40 bg-slate-950/95 px-5 py-2.5 text-center text-sm text-cyan-50 shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)] backdrop-blur-md"
      >
        {toast}
      </div>
    ) : null}
    </>
  );
}

function AllMatchingFestivalsOverlay({
  ranked,
  filters,
  rankLensLabel,
  onClose,
  onSelectFestival,
  selectedId,
  saved,
  compare,
  toggleSaved,
  toggleCompare
}: {
  ranked: { festival: Festival; score: number }[];
  filters: FestivoFilters;
  rankLensLabel: string;
  onClose: () => void;
  onSelectFestival: (f: Festival) => void;
  selectedId: string | null;
  saved: string[];
  compare: string[];
  toggleSaved: (id: string) => void;
  toggleCompare: (id: string) => void;
}) {
  const criteria = criteriaSummaryLines(filters);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-matching-title"
      className="fixed inset-0 flex items-stretch justify-center bg-black/80 p-3 sm:p-6"
      style={{ zIndex: 2147483640 }}
      onClick={onClose}
    >
      <div
        className="panel flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/[0.08] p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="all-matching-title" className="text-lg font-semibold text-white">
                All matching festivals
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {ranked.length} event{ranked.length === 1 ? "" : "s"} from your Festivo catalog
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Ordered by pulse score ({rankLensLabel}). Change filters above to widen or narrow this list.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/80"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {criteria.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs md:text-sm"
              >
                <span className="text-slate-500">{label}: </span>
                <span className="font-medium text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {ranked.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Nothing matches these criteria.</p>
          ) : (
            <ul className="space-y-2">
              {ranked.map(({ festival, score }) => (
                <li key={festival.id}>
                  <div
                    className={`rounded-xl border p-3 transition-colors md:p-3.5 ${
                      selectedId === festival.id
                        ? "border-cyan-400/45 bg-cyan-500/[0.08]"
                        : "border-slate-700/80 bg-slate-950/30 hover:border-slate-600"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectFestival(festival)}
                      className="flex w-full cursor-pointer gap-3 text-left"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={festival.imageUrl}
                          alt={festival.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-50">{festival.name}</span>
                        <p className="text-sm text-slate-400">
                          {festival.city}, {festival.country}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs italic text-slate-500">{festivalTagline(festival)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateRange(festival.startDate, festival.endDate)}
                        </p>
                        {festival.travelNotes ? (
                          <div className="mt-2">
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                              Travel notes
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-slate-400 line-clamp-2">
                              {festival.travelNotes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-center">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-300/80">Pulse</p>
                          <p className="text-lg font-semibold tabular-nums text-cyan-100">{score}</p>
                        </div>
                      </div>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-white/[0.06] pt-2 md:pl-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaved(festival.id);
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          saved.includes(festival.id)
                            ? "bg-cyan-500/15 text-cyan-200"
                            : "border border-slate-600/80 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {saved.includes(festival.id) ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(festival.id);
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          compare.includes(festival.id)
                            ? "bg-fuchsia-500/15 text-fuchsia-200"
                            : "border border-slate-600/80 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {compare.includes(festival.id) ? "In compare" : "Compare"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function detailSlides(festival: Festival): FestivalGalleryImage[] {
  const g = festival.imageGallery;
  if (g && g.length > 0) return g;
  return [
    {
      url: festival.imageUrl,
      alt: festival.name,
      credit: ""
    }
  ];
}

function FestivalHeroImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  const missing = !url?.trim();
  if (missing || failed) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-800 to-[#070b14] px-6 text-center"
        role="img"
        aria-label={alt}
      >
        <svg
          className="h-14 w-14 shrink-0 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="max-w-[12rem] text-xs font-medium leading-snug text-slate-400">Photo unavailable</p>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover object-center"
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function FestivalDetailDialog({
  festival,
  onClose,
  onSave,
  onCompare,
  onCopyShareLink,
  saved,
  inCompare
}: {
  festival: Festival;
  onClose: () => void;
  onSave: () => void;
  onCompare: () => void;
  onCopyShareLink: () => void;
  saved: boolean;
  inCompare: boolean;
}) {
  const slides = useMemo(() => detailSlides(festival), [festival]);
  const [slideIndex, setSlideIndex] = useState(0);
  const canStep = slides.length > 1;

  const tagline = useMemo(() => festivalTagline(festival), [festival.id]);

  const activeSlide = slides[slideIndex] ?? slides[0];

  useEffect(() => {
    setSlideIndex(0);
  }, [festival.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (!canStep) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSlideIndex((i) => (i + 1) % slides.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, canStep, slides.length]);

  const goPrev = () =>
    setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setSlideIndex((i) => (i + 1) % slides.length);

  return (
    <div
      data-festivo-overlay=""
      role="dialog"
      aria-modal="true"
      aria-labelledby="festival-overlay-title"
      className="fixed inset-0 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div
        className="panel flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl rounded-b-none shadow-2xl sm:rounded-2xl sm:max-h-[92vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-[min(42vh,280px)] w-full shrink-0 md:h-[min(45vh,320px)]">
          <FestivalHeroImage key={activeSlide.url} url={activeSlide.url} alt={activeSlide.alt} />
          {canStep ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65"
                aria-label="Previous photo"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65"
                aria-label="Next photo"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050810] via-[#050810]/55 to-[#050810]/15" />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-3 pb-3 pt-16">
            {canStep ? (
              <div className="flex justify-center gap-1.5" role="tablist" aria-label="Photo carousel">
                {slides.map((s, i) => (
                  <button
                    key={`${s.url}-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={i === slideIndex}
                    aria-label={`Photo ${i + 1} of ${slides.length}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlideIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slideIndex ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            ) : null}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                  {festival.city}, {festival.country}
                </p>
                <h3 id="festival-overlay-title" className="text-xl font-semibold leading-tight text-white drop-shadow md:text-2xl">
                  {festival.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm italic text-cyan-100/85">{tagline}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-black/60"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <p className="text-sm font-medium text-slate-200">
            <span className="text-slate-400">Dates: </span>
            {formatDateRange(festival.startDate, festival.endDate)}
          </p>

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">About this event</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{festival.description}</p>
            {festival.officialWebsite ? (
              <a
                href={festival.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline"
              >
                Learn more
              </a>
            ) : null}
          </div>

          {normalizeBestForTags(festival.bestFor).length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">Best for</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {normalizeBestForTags(festival.bestFor).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-2.5 py-1 text-xs font-medium text-cyan-100/95"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">Pulse breakdown</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Energy · Culture · Tourism density · Visual spectacle — same four axes as Pulse lens.
            </p>
            <div className="mt-3">
              <PulseBreakdownMini festival={festival} />
            </div>
          </div>

          {festival.travelNotes ? (
            <p className="mt-4 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
              <span className="font-medium text-slate-400">Travel notes: </span>
              {festival.travelNotes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/[0.08] bg-slate-950/30 p-4 sm:p-5 pt-3">
          <button
            type="button"
            onClick={onCopyShareLink}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/[0.1]"
          >
            Copy share link
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              saved
                ? "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                : "border border-cyan-500/40 bg-cyan-500/[0.12] text-cyan-50 hover:bg-cyan-500/25"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="rounded-lg border border-slate-500/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 hover:border-slate-400 hover:bg-slate-800/80"
          >
            {inCompare ? "In compare" : "Compare"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({
  ranked,
  selectedId,
  onSelectFestival,
  saved,
  compare,
  toggleSaved,
  toggleCompare,
  embedded = false
}: {
  ranked: { festival: Festival; score: number }[];
  selectedId: string | null;
  onSelectFestival: (festival: Festival) => void;
  saved: string[];
  compare: string[];
  toggleSaved: (id: string) => void;
  toggleCompare: (id: string) => void;
  embedded?: boolean;
}) {
  return (
    <div className={`${embedded ? "" : "panel max-h-[72vh] overflow-y-auto overscroll-contain rounded-2xl p-4 md:p-5"}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Matching</h2>
        <span className="text-xs tabular-nums text-slate-500">{ranked.length} events</span>
      </div>
      {ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-600/60 bg-slate-950/40 px-4 py-10 text-center">
          <p className="text-sm text-slate-400">No festivals match these filters.</p>
          <p className="mt-1 text-xs text-slate-500">Try widening the time window or changing region.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ranked.map(({ festival, score }) => (
            <article
              key={festival.id}
              className={`cursor-pointer overflow-hidden rounded-2xl border transition-all hover:border-slate-500/90 hover:shadow-[0_0_28px_-8px_rgba(34,211,238,0.22)] ${
                selectedId === festival.id
                  ? "border-cyan-400/50 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/25"
                  : "border-slate-700/80 bg-slate-950/25"
              }`}
              onClick={() => onSelectFestival(festival)}
            >
              <div className="relative h-36 w-full overflow-hidden sm:h-40">
                <FestivalHeroImage url={festival.imageUrl} alt={festival.name} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-2.5 pt-12">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white drop-shadow-md sm:text-lg">
                      {festival.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/80">
                      {festival.city}, {festival.country}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-cyan-400/35 bg-black/55 px-2.5 py-1.5 text-center shadow-lg backdrop-blur-md">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90">Pulse</p>
                    <p className="text-lg font-bold tabular-nums leading-none text-cyan-50">{score}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 p-3.5 sm:p-4">
                <p className="text-sm italic leading-snug text-slate-300">“{festivalTagline(festival)}”</p>
                {normalizeBestForTags(festival.bestFor).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {normalizeBestForTags(festival.bestFor).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/[0.07] px-2 py-0.5 text-[11px] font-medium text-fuchsia-100/95"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">{formatDateRange(festival.startDate, festival.endDate)}</p>
                <PulseBreakdownMini festival={festival} compact />
                {festival.travelNotes ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{festival.travelNotes}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSaved(festival.id);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      saved.includes(festival.id)
                        ? "bg-cyan-500/15 text-cyan-200"
                        : "border border-slate-600/80 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {saved.includes(festival.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCompare(festival.id);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      compare.includes(festival.id)
                        ? "bg-fuchsia-500/15 text-fuchsia-200"
                        : "border border-slate-600/80 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {compare.includes(festival.id) ? "In compare" : "Compare"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparePanel({
  festivals,
  compareIds,
  onToggleCompare,
  onCopyShareCompare
}: {
  festivals: Festival[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onCopyShareCompare: () => void;
}) {
  const compareFestivals = festivals.filter((festival) => compareIds.includes(festival.id));
  if (compareFestivals.length === 0) return null;

  return (
    <section className="panel mt-6 rounded-2xl p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Compare</h2>
          <p className="mt-0.5 text-xs text-slate-500">Up to three festivals · side-by-side Pulse rows</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs tabular-nums text-slate-500">{compareFestivals.length}/3 slots</p>
          <button
            type="button"
            onClick={onCopyShareCompare}
            className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/[0.08] px-3 py-1.5 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-500/15"
          >
            Copy compare link
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {compareFestivals.map((festival) => (
          <article
            key={festival.id}
            className="rounded-xl border border-fuchsia-500/15 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-slate-50">{festival.name}</h3>
                <p className="text-xs text-slate-400">
                  {festival.city}, {festival.country}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleCompare(festival.id)}
                className="shrink-0 rounded-lg border border-slate-600/80 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Remove
              </button>
            </div>
            <PulseBreakdownMini festival={festival} compact />
            {normalizeBestForTags(festival.bestFor).length > 0 ? (
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-slate-400">
                <span className="text-slate-500">Best for: </span>
                {normalizeBestForTags(festival.bestFor).join(" · ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
