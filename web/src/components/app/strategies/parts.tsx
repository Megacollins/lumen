"use client";

import { useId } from "react";
import { assetName, pct, STRATEGY_ASSETS } from "@/lib/strategy-assets";

export type Point = { at: string; ret: number };

/** Return since publishing, one point per recorded price snapshot. Draws nothing it doesn't have. */
export function PerfChart({ points, height = 160, compact = false }: { points: Point[]; height?: number; compact?: boolean }) {
  const id = useId();
  if (points.length < 2)
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-hairline text-center text-xs leading-relaxed text-ink-45 ${compact ? "h-14 px-3" : "px-6"}`}
        style={compact ? undefined : { height }}
      >
        {compact
          ? "Track record just started"
          : "The track record starts when the strategy is published. The chart fills in as Lumen records prices from NEAR Intents (at least once a day)."}
      </div>
    );
  const W = 600;
  const H = compact ? 56 : height;
  const pad = compact ? 2 : 8;
  const rets = points.map((p) => p.ret);
  // At least a 1-point range, so a flat line (or float noise around 0) stays flat instead of filling the height.
  const mid = (Math.min(0, ...rets) + Math.max(0, ...rets)) / 2;
  const span = Math.max(Math.max(0, ...rets) - Math.min(0, ...rets), 0.01);
  const lo = mid - span / 2;
  const t0 = new Date(points[0].at).getTime();
  const t1 = new Date(points.at(-1)!.at).getTime();
  const x = (p: Point) => (t1 === t0 ? 0 : ((new Date(p.at).getTime() - t0) / (t1 - t0)) * W);
  const y = (r: number) => pad + (1 - (r - lo) / span) * (H - 2 * pad);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p).toFixed(1)},${y(p.ret).toFixed(1)}`).join(" ");
  const up = rets.at(-1)! >= 0;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: H }}
      role="img"
      aria-label={`Return ${pct(rets.at(-1)!)} since publishing`}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={up ? "var(--up)" : "var(--down)"} stopOpacity="0.14" />
          <stop offset="1" stopColor={up ? "var(--up)" : "var(--down)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--hairline, #e3e2de)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Weight bars, largest first. */
export function Holdings({ weights }: { weights: Record<string, number> }) {
  const rows = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  return (
    <div className="border border-hairline bg-paper">
      {rows.map(([symbol, w]) => (
        <div key={symbol} className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-b-0">
          <span className="flex h-9 w-9 flex-none items-center justify-center border border-hairline bg-mist text-[11px] tracking-wide">
            {symbol}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{assetName(symbol)}</span>
            <span className="mt-1.5 block h-1 w-full bg-mist">
              <span className={`block h-1 ${symbol === "USDC" ? "bg-ink" : "bg-gold"}`} style={{ width: `${w}%` }} />
            </span>
          </span>
          <span className="tabular w-12 text-right text-sm">{w}%</span>
        </div>
      ))}
    </div>
  );
}

/** Whole-percent weights per asset; shows the running total so it's obvious when it reaches 100. */
export function WeightsEditor({ value, onChange }: { value: Record<string, number>; onChange: (w: Record<string, number>) => void }) {
  const total = Object.values(value).reduce((s, n) => s + (n || 0), 0);
  return (
    <div className="border border-hairline bg-paper">
      {STRATEGY_ASSETS.map((a) => (
        <label key={a.symbol} className="flex items-center gap-4 border-b border-hairline px-4 py-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center border border-hairline bg-mist text-[11px] tracking-wide">
            {a.symbol}
          </span>
          <span className="min-w-0 flex-1 text-sm">
            {a.name}
            <span className="block text-xs text-ink-45">{a.kind}</span>
          </span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={value[a.symbol] ?? ""}
              placeholder="0"
              onChange={(e) => {
                const n = e.target.value === "" ? 0 : Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
                onChange({ ...value, [a.symbol]: n });
              }}
              className="tabular h-9 w-16 border border-hairline bg-mist px-2 text-right outline-none focus:border-ink"
              aria-label={`${a.name} weight in percent`}
            />
            <span className="text-sm text-ink-45">%</span>
          </span>
        </label>
      ))}
      <div className={`flex justify-between px-4 py-3 text-sm ${total === 100 ? "text-ink" : "text-down"}`}>
        <span>Total</span>
        <span className="tabular">
          {total}% {total === 100 ? "" : "· needs to be 100%"}
        </span>
      </div>
    </div>
  );
}

export const cleanWeights = (w: Record<string, number>) => Object.fromEntries(Object.entries(w).filter(([, n]) => n > 0));
