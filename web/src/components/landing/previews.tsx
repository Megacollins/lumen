import { Logo } from "@/components/brand/logo";
import { PerfChart } from "@/components/app/strategies/parts";
import { CANDIDATE_ASSETS, getMarketRows } from "@/lib/markets";
import { getHeadlines, getUnderlying, UNDERLYING } from "@/lib/server/market-intel";
import { listStrategies, type StrategyCard } from "@/lib/server/strategy-views";
import { pct } from "@/lib/strategy-assets";
import { SparkIcon } from "./ui";

// Product visuals for the landing page. Each one renders live data from the same sources the app uses (the Strategies
// database, NEAR Intents prices, Yahoo Finance closes and Google News), framed as a device. Nothing here is invented:
// when a source can't be reached, the frame says so instead of showing a number.

const label = "text-[10px] uppercase tracking-[0.1em] text-ink-45";
const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
const tone = (r: number | null) => (r == null ? "text-ink-45" : r >= 0 ? "text-up" : "text-down");

/* ---------- Strategies: the live list, in a phone ---------- */

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-[244px] rounded-[38px] bg-ink-deep p-[9px] shadow-[0_40px_70px_-35px_rgba(20,20,19,0.55)] ${className}`}>
      <div className="relative overflow-hidden rounded-[32px] bg-cream">{children}</div>
    </div>
  );
}

function PhoneHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bg-ink px-5 pb-4 pt-6 text-white">
      <div className="flex items-center gap-2">
        <SparkIcon size={16} className="text-gold-light" />
        <span className="font-serif text-[24px] leading-none">{title}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-white/65">{sub}</p>
    </div>
  );
}

function StrategyRow({ s }: { s: StrategyCard }) {
  const top = Object.entries(s.weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, w]) => `${k} ${w}%`)
    .join(" · ");
  return (
    <div className="rounded-2xl border border-sand bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium tracking-[-0.01em]">{s.name}</div>
          <div className="truncate text-[11px] text-ink-60">{s.focus}</div>
        </div>
        <div className="text-right">
          <div className={`tabular text-[14px] ${tone(s.ret)}`}>{pct(s.ret)}</div>
          <div className="text-[9px] text-ink-45">since publishing</div>
        </div>
      </div>
      <div className="mt-2">
        <PerfChart points={s.points} compact />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[10px] text-ink-45">
        <span className="truncate">{top}</span>
        <span className="flex-none">@{s.creator.handle}</span>
      </div>
    </div>
  );
}

/** Live: the newest published strategies, as Invest → Strategies lists them. */
export async function StrategiesPhone() {
  let list: StrategyCard[] | null = null;
  try {
    list = await listStrategies();
  } catch {
    list = null;
  }
  return (
    <Phone>
      <PhoneHeader title="Strategies" sub="Published by Lumen investors" />
      <div className="flex min-h-[300px] flex-col gap-2.5 p-3">
        {list == null ? (
          <p className="m-auto px-4 text-center text-[12px] text-ink-45">Strategies couldn&apos;t be loaded right now.</p>
        ) : list.length === 0 ? (
          <p className="m-auto px-4 text-center text-[12px] text-ink-45">No strategies have been published yet.</p>
        ) : (
          list.slice(0, 2).map((s) => <StrategyRow key={s.id} s={s} />)
        )}
        <p className="mt-auto px-1 pt-1 text-[10px] leading-relaxed text-ink-45">
          Live from Lumen. Returns are a model from publish onward, priced from NEAR Intents. Following never trades for you.
        </p>
      </div>
    </Phone>
  );
}

export function StrategiesPhoneFallback() {
  return (
    <Phone>
      <PhoneHeader title="Strategies" sub="Published by Lumen investors" />
      <div className="flex min-h-[300px] items-center justify-center p-3 text-[12px] text-ink-45">Loading strategies…</div>
    </Phone>
  );
}

/* ---------- Intelligence: live key insights, with the AI assistant marked as coming ---------- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full w-[268px] rounded-[28px] border border-sand bg-white/80 p-4 shadow-[0_30px_60px_-35px_rgba(20,20,19,0.4)] backdrop-blur">
      {children}
    </div>
  );
}

function AskSoon() {
  return (
    <div className="ml-auto w-fit max-w-[230px] rounded-[18px] rounded-br-md bg-ink px-4 py-3 text-white">
      <div className="text-[13px] leading-snug">Ask Lumen, a private AI assistant</div>
      <div className="mt-1.5 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-gold-light">
        Coming soon
      </div>
    </div>
  );
}

/** Live: the same Yahoo Finance closes and Google News headlines that Invest → Intelligence shows. */
export async function IntelligencePanel() {
  const [quotes, gold] = await Promise.all([
    Promise.all(Object.keys(UNDERLYING).map((s) => getUnderlying(s))),
    getHeadlines(UNDERLYING.GLD.news, 1),
  ]);
  const priced = quotes.filter((q) => q?.change1d != null) as NonNullable<(typeof quotes)[number]>[];
  if (!priced.length) return <IntelligencePanelFallback note="Market data couldn't be loaded right now." />;
  const mover = [...priced].sort((a, b) => Math.abs(b.change1d!) - Math.abs(a.change1d!))[0];
  const up = priced.filter((q) => q.change1d! > 0).length;
  const gld = priced.find((q) => q.symbol === "GLD")?.change5d ?? null;
  const asOf = priced
    .map((q) => q.asOf)
    .sort()
    .at(-1)!;

  return (
    <Panel>
      <AskSoon />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] font-medium">Key insights</span>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-45">
          <span className="h-1.5 w-1.5 rounded-full bg-up" /> Live
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          ["Top mover 1d", UNDERLYING[mover.symbol].name, pct(mover.change1d, 1), tone(mover.change1d)],
          ["Gold 5d", "GLD", pct(gld, 1), tone(gld)],
          ["Up 1d", "All assets", `${up} of ${priced.length}`, ""],
        ].map(([k, sub, v, t]) => (
          <div key={k} className="rounded-xl border border-sand bg-cream p-2">
            <div className={label}>{k}</div>
            <div className="mt-1 truncate text-[11px] text-ink-60">{sub}</div>
            <div className={`tabular text-[15px] ${t}`}>{v}</div>
          </div>
        ))}
      </div>
      {gold[0] && (
        <a
          href={gold[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-sand bg-cream p-2.5 transition-colors hover:bg-gold-soft/60"
        >
          <span className="mt-0.5 h-8 w-8 flex-none rounded-lg bg-gradient-to-br from-[#f3d58a] to-[#b98a2e]" aria-hidden />
          <span className="min-w-0">
            <span className={label}>Latest on gold</span>
            <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug">{gold[0].title}</span>
            <span className="block text-[10px] text-ink-45">{gold[0].publisher}</span>
          </span>
        </a>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-ink-45">
        As of {time(asOf)}. Yahoo Finance daily closes and Google News. Informational, not advice.
      </p>
    </Panel>
  );
}

export function IntelligencePanelFallback({ note = "Loading live market data…" }: { note?: string }) {
  return (
    <Panel>
      <AskSoon />
      <div className="flex min-h-[220px] items-center justify-center text-[12px] text-ink-45">{note}</div>
    </Panel>
  );
}

/* ---------- Confidential investments: the Markets screen with live NEAR Intents prices ---------- */

const NAV = ["Overview", "Cash", "Invest", "Activity", "Settings"];
const SHOWN = ["NVDA", "AAPL", "MSFT", "TSLA", "SPY", "QQQ", "GLD", "SLV"];

function Laptop({ children, updated }: { children: React.ReactNode; updated: string }) {
  return (
    <div className="w-full">
      <div className="rounded-t-[22px] bg-ink-deep p-[8px] pb-0 shadow-[0_40px_80px_-40px_rgba(20,20,19,0.55)]">
        <div className="grid overflow-hidden rounded-t-[15px] bg-cream sm:grid-cols-[150px_1fr]">
          <aside className="hidden flex-col gap-1 bg-ink p-4 text-[12px] text-white/70 sm:flex">
            <div className="mb-4">
              <Logo size={17} inverted />
            </div>
            {NAV.map((n) => (
              <span key={n} className={`rounded-lg px-2.5 py-1.5 ${n === "Invest" ? "bg-white/12 text-white" : ""}`}>
                {n}
              </span>
            ))}
          </aside>
          <div className="min-w-0 p-4 sm:p-5">{children}</div>
        </div>
      </div>
      <div className="mx-[-3%] h-3 rounded-b-[14px] bg-gradient-to-b from-[#cbbd9f] to-[#a9987a]" aria-hidden />
      <p className="mt-4 text-[12px] leading-relaxed text-ink-45">{updated}</p>
    </div>
  );
}

/** Live: indicative prices from the NEAR Intents token list, as Invest → Markets shows them. */
export async function MarketsLaptop() {
  const { rows, live, updatedAt } = await getMarketRows();
  const shown = SHOWN.map((s) => rows.find((r) => r.symbol === s)!).filter(Boolean);
  return (
    <Laptop
      updated={
        live
          ? `Live indicative prices from NEAR Intents${updatedAt ? `, updated ${time(updatedAt)}` : ""}. The price you pay comes from a live quote when you order; orders open per asset after a verified test trade.`
          : "Prices can't be loaded from NEAR Intents right now."
      }
    >
      <MarketsTable rows={shown.map((r) => ({ ...r, price: live ? r.price : null }))} />
    </Laptop>
  );
}

function MarketsTable({ rows }: { rows: { symbol: string; name: string; kind: string; price: number | null }[] }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-[24px] leading-none">Markets</span>
        <span className="text-[11px] text-ink-45">{CANDIDATE_ASSETS.length} tokenized assets</span>
      </div>
      <div className="mt-3 divide-y divide-sand rounded-xl border border-sand bg-white">
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center gap-3 px-3 py-2 text-[13px]">
            <span className="w-11 flex-none text-[11px] tracking-wide text-ink-60">{r.symbol}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="hidden text-[11px] text-ink-45 sm:inline">{r.kind}</span>
            <span className="tabular w-[72px] text-right">{r.price == null ? "—" : `$${r.price.toFixed(2)}`}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function MarketsLaptopFallback() {
  return (
    <Laptop updated="Loading prices from NEAR Intents…">
      <MarketsTable rows={SHOWN.map((s) => ({ ...CANDIDATE_ASSETS.find((a) => a.symbol === s)!, price: null }))} />
    </Laptop>
  );
}
