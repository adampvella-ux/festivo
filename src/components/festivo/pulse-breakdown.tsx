import type { Festival } from "@/types/festival";
import { pulseBreakdown } from "@/lib/festival-pulse-present";

export function PulseBreakdownMini({
  festival,
  compact = false
}: {
  festival: Festival;
  compact?: boolean;
}) {
  const rows = pulseBreakdown(festival);
  return (
    <ul className={`grid gap-1.5 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
      {rows.map((row) => (
        <li
          key={row.key}
          className="rounded-lg border border-white/[0.07] bg-slate-950/55 px-2.5 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
              {row.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-cyan-200/95">
              {row.score}
              <span className="font-normal text-slate-500">/5</span>
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{row.flair}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600/90 to-fuchsia-500/80"
              style={{ width: `${(row.score / 5) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
