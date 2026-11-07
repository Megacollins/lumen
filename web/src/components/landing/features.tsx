import { getHeadlines, getUnderlying, UNDERLYING } from "@/lib/server/market-intel";

// Previews of Invest → Strategies and Invest → Intelligence for the landing page. The Strategies one is an example
// layout with no performance figure (none exists until a real strategy has a track record); the Intelligence one is
// live data from the same sources the app uses.

const label = "text-[11px] uppercase tracking-[0.08em] text-ink-45";
const pct = (r: number | null, d = 1) => (r == null ? "—" : `${r >= 0 ? "+" : "−"}${Math.abs(r * 100).toFixed(d)}%`);
const tone = (r: number | null) => (r == null ? "text-ink-45" : r >= 0 ? "text-up" : "text-down");

export function StrategiesPreview() {
  const weights: [string, string, number][] = [
    ["GLD", "SPDR Gold Shares", 40],
    ["NVDA", "NVIDIA", 30],
    ["MSFT", "Microsoft", 20],
    ["USDC", "US dollars (cash)", 10],
  ];
  return (
    <div className="border border-hairline bg-paper p-5 text-sm" aria-label="Example strategy">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg tracking-[-0.015em]">Gold and big tech</div>
          <div className="text-[13px] text-ink-60">Long-term growth with a gold hedge</div>
        </div>
        <span className="border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Example</span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {weights.map(([sym, name, w]) => (
          <div key={sym} className="flex items-center gap-3">
            <span className="w-11 flex-none text-[11px] tracking-wide text-ink-60">{sym}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{name}</span>
              <span className="mt-1 block h-1 bg-mist">
                <span className={`block h-1 ${sym === "USDC" ? "bg-ink" : "bg-gold"}`} style={{ width: `${w}%` }} />
              </span>
            </span>
            <span className="tabular w-9 text-right text-[13px]">{w}%</span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-hairline pt-3">
        <div className={label}>What the creator shares</div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] text-ink-70">
          <li>Allocation · always</li>
          <li>Holdings check · if chosen</li>
          <li>Value range · if chosen</li>
          <li>Account id · off by default</li>
        </ul>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-45">
        Returns appear once Lumen has recorded prices for a published strategy, from NEAR Intents. Following never trades for you.
      </p>
    </div>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** Live: the same Yahoo Finance closes and Google News headlines that Invest → Intelligence shows. */
export async function IntelligencePreview() {
  const [quotes, gold] = await Promise.all([
    Promise.all(Object.keys(UNDERLYING).map((s) => getUnderlying(s))),
    getHeadlines(UNDERLYING.GLD.news, 1),
  ]);
  const priced = quotes.filter((q) => q?.change1d != null) as NonNullable<(typeof quotes)[number]>[];
  if (!priced.length) return <IntelligencePreviewFallback note="Market data couldn't be loaded right now." />;
  const mover = [...priced].sort((a, b) => Math.abs(b.change1d!) - Math.abs(a.change1d!))[0];
  const up = priced.filter((q) => q.change1d! > 0).length;
  const five = (s: string) => priced.find((q) => q.symbol === s)?.change5d ?? null;
  const asOf = priced
    .map((q) => q.asOf)
    .sort()
    .at(-1)!;

  return (
    <div className="border border-hairline bg-paper p-5 text-sm" aria-label="Live market insights">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg tracking-[-0.015em]">Key insights</div>
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">
          <span className="h-1.5 w-1.5 rounded-full bg-up" /> Live
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="border border-hairline p-3">
          <div className={label}>Biggest move</div>
          <div className="mt-2 truncate text-[13px]">{UNDERLYING[mover.symbol].name}</div>
          <div className={`tabular text-lg ${tone(mover.change1d)}`}>{pct(mover.change1d)}</div>
        </div>
        <div className="border border-hairline p-3">
          <div className={label}>Gold, 5 days</div>
          <div className="mt-2 text-[13px]">GLD</div>
          <div className={`tabular text-lg ${tone(five("GLD"))}`}>{pct(five("GLD"))}</div>
        </div>
        <div className="border border-hairline p-3">
          <div className={label}>Breadth</div>
          <div className="mt-2 text-[13px]">rose</div>
          <div className="tabular text-lg">
            {up}/{priced.length}
          </div>
        </div>
      </div>
      {gold[0] && (
        <div className="mt-4 border-t border-hairline pt-3">
          <div className={label}>Latest on gold</div>
          <a
            href={gold[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 block leading-snug hover:underline hover:underline-offset-4"
          >
            {gold[0].title}
          </a>
          <div className="text-[11px] text-ink-45">{gold[0].publisher}</div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="text-[13px] text-ink-70">Ask Lumen, the private AI assistant</span>
        <span className="flex-none border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">
          Coming soon
        </span>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-45">
        Last session as of {time(asOf)}. Sources: Yahoo Finance daily closes and Google News. Informational, not advice.
      </p>
    </div>
  );
}

export function IntelligencePreviewFallback({ note = "Loading live market data…" }: { note?: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center border border-hairline bg-paper p-5 text-sm text-ink-45">{note}</div>
  );
}
