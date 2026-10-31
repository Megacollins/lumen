import { Reveal } from "@/components/motion/reveal";
import { SwapIcon } from "@/components/brand/icons";
import { CANDIDATE_ASSETS, getMarketRows } from "@/lib/markets";

function Card({ symbol, kind, name, price }: { symbol: string; kind: string; name: string; price: string }) {
  return (
    <div className="border border-hairline bg-paper px-7 pb-6 pt-7">
      <div className="flex justify-between text-[13px] text-ink-60">
        <span>{symbol}</span>
        <span>{kind}</span>
      </div>
      <div className="mt-2.5 text-xl tracking-[-0.015em]">{name}</div>
      <div className="tabular mt-7 text-[30px] tracking-[-0.03em]">{price}</div>
    </div>
  );
}

function SolverCard() {
  return (
    <div className="flex h-full flex-col justify-between gap-6 border border-hairline bg-ink px-7 pb-6 pt-7 text-white">
      <SwapIcon size={28} />
      <p className="text-[15px] leading-relaxed text-white/75">
        Independent solvers compete to fill every order. Minimum order about $30.
      </p>
    </div>
  );
}

/** Live prices from NEAR Intents. Streams in behind <MarketGridFallback/>. */
export async function MarketGrid() {
  const { rows, live } = await getMarketRows();
  return (
    <>
      {rows.map((a, i) => (
        <Reveal key={a.symbol} delay={i * 0.05}>
          <Card {...a} price={a.price == null ? "—" : `$${a.price.toFixed(2)}`} />
        </Reveal>
      ))}
      <Reveal delay={0.25}>
        <SolverCard />
      </Reveal>
      <p className="text-xs text-ink-45 sm:col-span-2">
        {live ? "Live prices from NEAR Intents." : "Prices unavailable right now."} Trading opens per asset once its
        route is verified.
      </p>
    </>
  );
}

export function MarketGridFallback() {
  return (
    <>
      {CANDIDATE_ASSETS.map((a) => (
        <Card key={a.symbol} {...a} price="—" />
      ))}
      <SolverCard />
    </>
  );
}
