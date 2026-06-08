"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { Festival, ScoreLens } from "@/types/festival";

type RankedFestival = { festival: Festival; score: number };

type LensOption = { id: ScoreLens; label: string; pulseHint?: string };

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const SOURCE_ID = "festivo-points";
const LAYER_PULSE = "festivo-pulse-halo";
const LAYER_ID = "festivo-circles";

function tier(score: number): "high" | "mid" | "low" {
  if (score >= 4.5) return "high";
  if (score >= 3.5) return "mid";
  return "low";
}

function buildGeoJSON(ranked: RankedFestival[], selectedId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: ranked.map(({ festival, score }) => {
      const t = tier(score);
      const selected = festival.id === selectedId;
      const base = t === "high" ? 9 : t === "mid" ? 7.5 : 6.5;
      const r = selected ? base + 4 : base;
      return {
        type: "Feature" as const,
        id: festival.id,
        geometry: { type: "Point" as const, coordinates: [festival.longitude, festival.latitude] },
        properties: {
          id: festival.id,
          name: festival.name,
          tier: t,
          r,
          selected: selected ? 1 : 0
        }
      };
    })
  };
}

function festivalSetKey(ranked: RankedFestival[]) {
  return ranked
    .map((r) => r.festival.id)
    .sort()
    .join("|");
}

export function MapPanel({
  festivals,
  selectedId,
  onSelect,
  activeLens,
  lensOptions,
  onLensChange,
  layoutRevision
}: {
  festivals: RankedFestival[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeLens: ScoreLens;
  lensOptions: LensOption[];
  onLensChange: (lens: ScoreLens) => void;
  /** Bump when surrounding layout changes (e.g. refine drawer) so Mapbox resizes. */
  layoutRevision?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl") | null>(null);
  const onSelectRef = useRef(onSelect);
  const hoveredIdRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  onSelectRef.current = onSelect;

  const active = useMemo(() => festivals.find((item) => item.festival.id === selectedId), [festivals, selectedId]);
  const dataKey = useMemo(() => festivalSetKey(festivals), [festivals]);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let onWinResize: (() => void) | undefined;
    const pulseRafRef = { id: 0 };

    const boot = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        mapboxRef.current = await import("mapbox-gl");

        if (cancelled || !containerRef.current) return;

        setMapError(null);
        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [15, 20],
          zoom: 1.35,
          attributionControl: true
        });
        mapRef.current = map;

        const fitMapToContainer = () => {
          requestAnimationFrame(() => map.resize());
        };
        onWinResize = fitMapToContainer;

        const onMapError = (e: { error?: { status?: number; message?: string } } & unknown) => {
          const err = e && typeof e === "object" && "error" in e ? e.error : undefined;
          if (!err) return;
          if (err.status === 401 || err.status === 403) {
            setMapError("Invalid or unauthorized Mapbox token. Check NEXT_PUBLIC_MAPBOX_TOKEN in .env.local.");
            return;
          }
          if (typeof err.message === "string" && /style|glyphs|sprite/i.test(err.message)) {
            setMapError(err.message);
          }
        };
        map.on("error", onMapError);

        map.once("load", () => {
          if (cancelled) return;
          setMapError(null);
          fitMapToContainer();

          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            promoteId: "id",
            generateId: false
          });

          map.addLayer({
            id: LAYER_PULSE,
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", ["get", "tier"], "high"],
            paint: {
              "circle-radius": ["+", ["get", "r"], 10],
              "circle-color": [
                "match",
                ["get", "tier"],
                "high",
                "#ef4444",
                "mid",
                "#f59e0b",
                "#38bdf8"
              ],
              "circle-opacity": 0.22,
              "circle-blur": 1.2,
              "circle-stroke-width": 0
            }
          });

          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-radius": ["get", "r"],
              "circle-color": [
                "match",
                ["get", "tier"],
                "high",
                "#ef4444",
                "mid",
                "#f59e0b",
                "#38bdf8"
              ],
              "circle-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                1,
                0.9
              ],
              "circle-stroke-width": [
                "case",
                ["==", ["get", "selected"], 1],
                3.5,
                ["boolean", ["feature-state", "hover"], false],
                2.5,
                1.8
              ],
              "circle-stroke-color": [
                "case",
                ["==", ["get", "selected"], 1],
                "#22d3ee",
                ["boolean", ["feature-state", "hover"], false],
                "#fef9c3",
                "rgba(255,255,255,0.55)"
              ],
              "circle-stroke-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                1,
                ["==", ["get", "selected"], 1],
                1,
                0.85
              ]
            }
          });

          const clearHover = () => {
            const hid = hoveredIdRef.current;
            if (hid) {
              try {
                map.setFeatureState({ source: SOURCE_ID, id: hid }, { hover: false });
              } catch {
                /* ignore stale feature id */
              }
              hoveredIdRef.current = null;
            }
          };

          map.on("mousemove", LAYER_ID, (e) => {
            const f = e.features?.[0];
            const id =
              f?.properties && typeof f.properties === "object" && "id" in f.properties
                ? String(f.properties.id)
                : null;
            if (!id) return;
            if (hoveredIdRef.current === id) return;
            clearHover();
            hoveredIdRef.current = id;
            try {
              map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
            } catch {
              /* ignore */
            }
          });

          map.on("mouseleave", LAYER_ID, () => {
            clearHover();
            map.getCanvas().style.cursor = "";
          });

          map.on("mouseenter", LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("click", LAYER_ID, (e) => {
            const f = e.features?.[0];
            const id =
              f?.properties && typeof f.properties === "object" && "id" in f.properties
                ? String(f.properties.id)
                : null;
            if (id) onSelectRef.current(id);
          });

          const pulseLoop = () => {
            const pulse = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(Date.now() / 700));
            if (map.getLayer(LAYER_PULSE)) {
              map.setPaintProperty(LAYER_PULSE, "circle-opacity", pulse);
            }
            pulseRafRef.id = requestAnimationFrame(pulseLoop);
          };
          pulseRafRef.id = requestAnimationFrame(pulseLoop);

          setMapReady(true);
          fitMapToContainer();
        });

        window.addEventListener("resize", fitMapToContainer);
        ro = new ResizeObserver(() => {
          fitMapToContainer();
        });
        ro.observe(el);
      } catch (err) {
        if (!cancelled) {
          setMapError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(pulseRafRef.id);
      ro?.disconnect();
      if (onWinResize) window.removeEventListener("resize", onWinResize);
      const m = mapRef.current;
      if (m) {
        m.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !token) return;

    const geo = buildGeoJSON(festivals, selectedId);
    const src = map.getSource(SOURCE_ID) as import("mapbox-gl").GeoJSONSource | undefined;
    if (src) {
      src.setData(geo);
    }
    requestAnimationFrame(() => map.resize());
  }, [festivals, selectedId, mapReady, token]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current?.default;
    if (!map || !mapReady || !mapboxgl || festivals.length === 0) return;

    const coords = festivals.map(
      ({ festival }) => [festival.longitude, festival.latitude] as [number, number]
    );
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 72, maxZoom: 5.8, duration: 900 });
  }, [dataKey, mapReady, festivals.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const hit = festivals.find((item) => item.festival.id === selectedId);
    if (!hit) return;
    map.flyTo({
      center: [hit.festival.longitude, hit.festival.latitude],
      zoom: Math.max(map.getZoom(), 4.2),
      duration: 850,
      essential: true
    });
  }, [selectedId, mapReady, festivals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const t = window.setTimeout(() => map.resize(), 320);
    return () => window.clearTimeout(t);
  }, [layoutRevision, mapReady]);

  return (
    <section className="panel relative min-h-[72vh] overflow-hidden rounded-2xl">
      {!token ? (
        <div className="grid h-[72vh] place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-200">Map preview unavailable</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Add <code className="text-xs text-slate-300">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
              <code className="text-xs text-slate-300">.env.local</code>, then restart the dev server.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className={`h-[72vh] w-full min-h-[50vh] ${mapError ? "opacity-30" : ""}`}
            style={{ minHeight: "min(72vh, 720px)" }}
          />
          {mapError ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="max-w-md rounded-2xl border border-amber-500/35 bg-slate-950/95 px-5 py-6 shadow-xl">
                <p className="text-sm font-semibold text-amber-100">Map connection failed</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Check <code className="text-xs text-slate-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
                  <code className="text-xs text-slate-400">.env.local</code>, then restart{" "}
                  <code className="text-xs text-slate-400">npm run dev</code>.
                </p>
                <p className="mt-3 font-mono text-xs text-slate-500">{mapError}</p>
              </div>
            </div>
          ) : null}
        </>
      )}
      {token ? (
      <>
      <div className="pointer-events-auto absolute left-3 top-3 z-20 max-w-[min(100%-1.5rem,14rem)] rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-xs shadow-lg backdrop-blur-md sm:max-w-[16rem]">
        <label htmlFor="festivo-map-lens" className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Map setting · Pulse lens
        </label>
        <select
          id="festivo-map-lens"
          value={activeLens}
          onChange={(e) => onLensChange(e.target.value as ScoreLens)}
          className="festivo-select mt-1.5 w-full text-xs"
        >
          {lensOptions.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
          Controls marker heat and list ranking.
        </p>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300 shadow-lg backdrop-blur-md">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Constellation</p>
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)]" /> High pulse
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.65)]" /> Building
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]" /> Emerging
        </p>
      </div>
      {active ? (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[min(100%-1.5rem,20rem)] rounded-xl border border-cyan-400/30 bg-slate-950/85 px-3 py-2.5 text-sm shadow-[0_0_24px_-8px_rgba(34,211,238,0.45)] backdrop-blur-md">
          <p className="font-semibold leading-snug text-white">{active.festival.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {active.festival.city}, {active.festival.country}
          </p>
        </div>
      ) : null}
      </>
      ) : null}
    </section>
  );
}
