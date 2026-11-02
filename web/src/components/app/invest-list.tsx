"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usd, useMarkets } from "./use-markets";

export function InvestList() {
  const markets = useMarkets();

  return (
    <div className="pb-16 pt-6 md:pt-8">
      <h1 className="text-[32px] font-normal leading-tight tracking-[-0.035em] md:text-[36px]">
        Invest, <i>quietly</i>.
      </h1>
      <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink-60">
        Tokenized stocks and ETFs from Ondo Global Markets, bought with your private cash through NEAR Intents. Each
        token gives economic exposure to the underlying asset; it is not direct share ownership.
      </p>

      <div className="mt-5 flex items-start gap-3 border border-[#EBDDB4] bg-[#FBF5E4] p-4 text-sm text-[#6B5318]">
        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
        <span>Prices below are indicative. Buy and sell quotes come live from NEAR Intents; orders open per asset once its route passes a real test on mainnet.</span>
      </div>

      <div className="mt-6 border border-hairline bg-paper">
        {(markets?.rows ?? []).map((a) => (
          <Link
            key={a.symbol}
            href={`/app/invest/${a.symbol}`}
            className="flex items-center gap-4 border-b border-hairline px-4 py-3 transition-colors last:border-b-0 hover:bg-mist"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center border border-hairline bg-mist text-xs tracking-wide">
              {a.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block leading-snug">{a.name}</span>
              <span className="block text-xs text-ink-45">{a.kind}</span>
            </span>
            <span className="tabular text-right">{a.price == null ? "—" : usd(a.price)}</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-ink-45" aria-hidden />
          </Link>
        ))}
        {!markets &&
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-[73px] animate-pulse border-b border-hairline bg-paper last:border-b-0" />
          ))}
      </div>
      {markets && !markets.live && <p className="mt-3 text-sm text-down">Prices couldn&apos;t be loaded right now.</p>}
      <p className="mt-4 text-xs leading-relaxed text-ink-45">
        Not available to US persons. Some jurisdictions require professional-investor status. Prices can fall as well as
        rise.
      </p>
    </div>
  );
}
