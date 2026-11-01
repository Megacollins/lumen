import { Reveal } from "@/components/motion/reveal";
import { SwapIcon } from "@/components/brand/icons";
import { CANDIDATE_ASSETS, getMarketRows, MIN_ORDER_USD } from "@/lib/markets";

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

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** Indicative prices and listing status from NEAR Intents. Streams in behind <MarketGridFallback/>. */
export async function MarketGrid() {
  const { rows, live, updatedAt } = await getMarketRows();
  return (
    <>
      {rows.map((a, i) => (
        <Reveal key={a.symbol} delay={i * 0.05}>
          <Card
            {...a}
            price={a.price == null ? "—" : `$${a.price.toFixed(2)}`}
            status={!live ? "Price unavailable" : !a.listed ? "Not listed on NEAR Intents right now" : a.tradable ? "Indicative · orders open" : "Indicative · orders in preview"}
          />
        </Reveal>
      ))}
      <Reveal delay={0.25}>
        <SolverCard />
      </Reveal>
      <p className="text-xs leading-relaxed text-ink-45 sm:col-span-2">
        {live
          ? `Indicative prices from the NEAR Intents token list${updatedAt ? `, last updated ${time(updatedAt)}` : ""}. Outside stock market hours they may not move. `
          : "Prices can't be loaded from NEAR Intents right now. "}
        The price you pay comes from a live quote when you order. Orders open per asset after a verified test trade on
        mainnet; until then Lumen shows quotes only.
      </p>
    </>
  );
}

export function MarketGridFallback() {
  return (
    <>
      {CANDIDATE_ASSETS.map((a) => (
        <Card key={a.symbol} {...a} price="—" status="Loading price…" />
      ))}
      <SolverCard />
    </>
  );
}
