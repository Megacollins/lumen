"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { findAsset, MIN_ORDER_USD } from "@/lib/markets";
import { useAccount } from "./account-app";
import { TradeSheet } from "./trade-sheet";
import { usd, useMarkets } from "./use-markets";

export function AssetDetail({ symbol }: { symbol: string }) {
  const asset = findAsset(symbol);
  const markets = useMarkets();
  const { account } = useAccount();
  const [sheet, setSheet] = useState<"buy" | "sell" | null>(null);

  if (!asset)
    return (
      <div className="pt-10">
        <p>We don&apos;t offer {symbol}.</p>
        <Link href="/app/invest" className="mt-4 inline-block underline underline-offset-4">
          Back to Invest
        </Link>
      </div>
    );

  const row = markets?.rows.find((r) => r.symbol === asset.symbol);
  const bal = account.balances.find((b) => b.tokenId === asset.assetId);
  const holding = bal ? Number(bal.available) / 10 ** asset.decimals : 0;

  return (
    <div className="pb-16 pt-6">
      <Link href="/app/invest" className="inline-flex items-center gap-1 text-sm text-ink-60 transition-opacity hover:opacity-70">
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> Invest
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center border border-hairline bg-paper text-xs tracking-wide">{asset.symbol}</span>
        <div>
          <h1 className="text-[26px] font-normal leading-tight tracking-[-0.02em]">{asset.name}</h1>
          <div className="text-[13px] text-ink-45">
            {asset.symbol} · {asset.kind} · tokenized by Ondo
          </div>
        </div>
      </div>

      <div className="tabular mt-8 text-[48px] leading-none tracking-[-0.04em]">
        {row?.price == null ? "—" : usd(row.price)}
      </div>
      <p className="mt-2 text-[13px] text-ink-45">Live price from NEAR Intents</p>

      <div className="mt-8 grid grid-cols-2 gap-2 md:max-w-[420px]">
        <button type="button" onClick={() => setSheet("buy")} className="h-[52px] bg-ink font-medium text-white transition-opacity hover:opacity-70">
          Buy
        </button>
        <button type="button" onClick={() => setSheet("sell")} className="h-[52px] border border-ink bg-paper font-medium transition-opacity hover:opacity-70">
          Sell
        </button>
      </div>

      <section className="mt-10 border border-hairline bg-paper">
        <div className="flex justify-between px-4 py-3.5 text-sm">
          <span className="text-ink-60">You hold</span>
          <span className="tabular">
            {holding > 0 ? `${holding.toFixed(4)} ${asset.symbol}` : "None yet"}
          </span>
        </div>
        <div className="flex justify-between border-t border-hairline px-4 py-3.5 text-sm">
          <span className="text-ink-60">Minimum order</span>
          <span className="tabular">{usd(markets?.minOrderUsd ?? MIN_ORDER_USD)}</span>
        </div>
        <div className="flex justify-between border-t border-hairline px-4 py-3.5 text-sm">
          <span className="text-ink-60">Orders</span>
          <span>{row?.tradable ? "Open" : "Preview only"}</span>
        </div>
      </section>

      <section className="mt-6 text-[15px] leading-relaxed text-ink-60">
        <h2 className="text-base text-ink">What you&apos;re buying</h2>
        <p className="mt-2">
          {asset.symbol}on is a token issued by Ondo Global Markets that tracks the price of {asset.name}
          {asset.kind === "Gold fund" ? " (a gold fund, not physical gold)" : ""}. It gives economic exposure only: no
          voting rights and no direct ownership of the underlying asset. The token lives on BNB Chain and is held in
          your NEAR Intents account.
        </p>
      </section>

      <TradeSheet
        open={sheet !== null}
        side={sheet ?? "buy"}
        asset={asset}
        holding={holding}
        minOrderUsd={markets?.minOrderUsd ?? MIN_ORDER_USD}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}
