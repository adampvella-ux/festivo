"use client";

import type { FestivoFilters } from "@/types/festival";

export const CATALOG_SEASON = { start: "2026-01-01", end: "2026-12-31" } as const;

export const TIME_WINDOW_PRESETS: { id: FestivoFilters["datePreset"]; label: string }[] = [
  { id: "custom", label: "2026 season" },
  { id: "next_30", label: "30 days" },
  { id: "next_60", label: "60 days" },
  { id: "next_90", label: "90 days" },
  { id: "any", label: "Any date" }
];

function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysFromYmd(ymd: string, days: number) {
  const d = new Date(ymd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return localYmd();
  d.setDate(d.getDate() + days);
  return localYmd(d);
}

type Props = {
  filters: FestivoFilters;
  onChange: (next: FestivoFilters) => void;
};

export function TimeWindowFilter({ filters, onChange }: Props) {
  const isCatalogSeason =
    filters.datePreset === "custom" &&
    filters.customRangeStart === CATALOG_SEASON.start &&
    filters.customRangeEnd === CATALOG_SEASON.end;
  const isCustom = filters.datePreset === "custom" && !isCatalogSeason;

  function selectPreset(id: FestivoFilters["datePreset"]) {
    if (id === "custom" && TIME_WINDOW_PRESETS[0]?.label === "2026 season") {
      onChange({
        ...filters,
        datePreset: "custom",
        customRangeStart: CATALOG_SEASON.start,
        customRangeEnd: CATALOG_SEASON.end
      });
      return;
    }
    if (id === "custom") {
      onChange({
        ...filters,
        datePreset: "custom",
        customRangeStart: filters.customRangeStart ?? localYmd(),
        customRangeEnd: filters.customRangeEnd ?? addDaysFromYmd(filters.customRangeStart ?? localYmd(), 90)
      });
      return;
    }
    onChange({ ...filters, datePreset: id });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TIME_WINDOW_PRESETS.map(({ id, label }) => (
          <button
            key={id === "custom" && label === "2026 season" ? "catalog-season" : id}
            type="button"
            onClick={() => selectPreset(id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              (id === "custom" && label === "2026 season" ? isCatalogSeason : filters.datePreset === id)
                ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                : "border-slate-600/80 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:bg-slate-900/60"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              datePreset: "custom",
              customRangeStart: filters.customRangeStart ?? localYmd(),
              customRangeEnd: filters.customRangeEnd ?? addDaysFromYmd(filters.customRangeStart ?? localYmd(), 90)
            })
          }
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            isCustom
              ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
              : "border-slate-600/80 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:bg-slate-900/60"
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom ? (
        <div className="rounded-xl border border-cyan-500/25 bg-slate-950/40 px-3 py-3 sm:px-4">
          <p className="mb-2 text-xs font-medium text-slate-400">Custom range</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs text-slate-500">Start</span>
              <input
                type="date"
                value={filters.customRangeStart ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    datePreset: "custom",
                    customRangeStart: e.target.value,
                    customRangeEnd: filters.customRangeEnd ?? addDaysFromYmd(e.target.value, 1)
                  })
                }
                className="festivo-select w-full min-w-0 font-[inherit] text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-60"
              />
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs text-slate-500">End</span>
              <input
                type="date"
                value={filters.customRangeEnd ?? ""}
                min={filters.customRangeStart || undefined}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    datePreset: "custom",
                    customRangeEnd: e.target.value
                  })
                }
                className="festivo-select w-full min-w-0 font-[inherit] text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-60"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">Shows events that overlap this window.</p>
        </div>
      ) : null}
    </div>
  );
}

export function formatTimeWindowCriteria(filters: FestivoFilters): string {
  if (
    filters.datePreset === "custom" &&
    filters.customRangeStart === CATALOG_SEASON.start &&
    filters.customRangeEnd === CATALOG_SEASON.end
  ) {
    return "2026 season";
  }
  if (filters.datePreset === "custom" && filters.customRangeStart && filters.customRangeEnd) {
    return `Custom · ${filters.customRangeStart} → ${filters.customRangeEnd}`;
  }
  return TIME_WINDOW_PRESETS.find((p) => p.id === filters.datePreset)?.label ?? filters.datePreset;
}
