import { Reveal } from "@/components/motion/reveal";
import { SwapIcon } from "@/components/brand/icons";
import { CANDIDATE_ASSETS, FEATURED_SYMBOLS, getMarketRows, MIN_ORDER_USD } from "@/lib/markets";

function Card({ symbol, kind, name, price, status }: { symbol: string; kind: string; name: string; price: string; status: string }) {
  return (
    <div className="flex h-full flex-col border border-hairline bg-paper px-7 pb-6 pt-7">
      <div className="flex justify-between text-[13px] text-ink-60">
        <span className="tracking-wide">{symbol}</span>
        <span>{kind}</span>
      </div>
      <div className="mt-2.5 text-xl tracking-[-0.015em]">{name}</div>
      <div className="mt-auto pt-7">
        <div className="tabular text-[30px] leading-none tracking-[-0.03em]">{price}</div>
        <div className="mt-2 text-xs text-ink-45">{status}</div>
      </div>
    </div>
  );
}

function SolverCard() {
  return (
    <div className="flex h-full flex-col justify-between gap-6 border border-hairline bg-ink px-7 pb-6 pt-7 text-white">
      <SwapIcon size={28} />
      <p className="text-[15px] leading-relaxed text-white/80">
        Orders route through NEAR Intents, where independent solvers compete to fill them. Minimum order ${MIN_ORDER_USD}.
      </p>
    </div>
  );
}

/** Phones: one row you swipe sideways (no snapping). From sm up: the two-column grid. */
const ROW =
  "-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden";
const ITEM = "w-[76%] flex-none sm:w-auto";

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** Indicative prices and listing status from NEAR Intents. Streams in behind <MarketGridFallback/>. */
const featured = (symbol: string) => (FEATURED_SYMBOLS as readonly string[]).includes(symbol);
const others = CANDIDATE_ASSETS.filter((a) => !featured(a.symbol)).map((a) => a.name);

export async function MarketGrid() {
  const { rows: all, live, updatedAt } = await getMarketRows();
  const rows = all.filter((r) => featured(r.symbol));
  return (
    <>
      <div className={ROW}>
        {rows.map((a, i) => (
          <Reveal key={a.symbol} delay={i * 0.05} className={ITEM}>
            <Card
              {...a}
              price={a.price == null ? "—" : `$${a.price.toFixed(2)}`}
              status={
                !live
                  ? "Price unavailable"
                  : !a.listed
                    ? "Not listed on NEAR Intents right now"
                    : a.tradable
                      ? "Indicative · orders open"
                      : "Indicative · orders in preview"
              }
            />
          </Reveal>
        ))}
        <Reveal delay={0.25} className={ITEM}>
          <SolverCard />
        </Reveal>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-45">
        {live
          ? `Indicative prices from the NEAR Intents token list${updatedAt ? `, last updated ${time(updatedAt)}` : ""}. Outside stock market hours they may not move. `
          : "Prices can't be loaded from NEAR Intents right now. "}
        The price you pay comes from a live quote when you order. Orders open per asset after a verified test trade on mainnet; until then
        Lumen shows quotes only. Also in the app: {others.slice(0, -1).join(", ")} and {others.at(-1)}.
      </p>
    </>
  );
}

export function MarketGridFallback() {
  return (
    <div className={ROW}>
      {CANDIDATE_ASSETS.filter((a) => featured(a.symbol)).map((a) => (
        <div key={a.symbol} className={ITEM}>
          <Card {...a} price="—" status="Loading price…" />
        </div>
      ))}
      <div className={ITEM}>
        <SolverCard />
      </div>
    </div>
  );
}
