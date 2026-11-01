"use client";

import Link from "next/link";
import { useState } from "react";
import { RevealIcon } from "@/components/brand/icons";
import { CANDIDATE_ASSETS, USDC } from "@/lib/markets";
import { useAccount } from "./account-app";

function formatUnits(base: string, decimals: number) {
  return Number(base) / 10 ** decimals;
}

export function Overview() {
  const { account } = useAccount();
  const [revealed, setRevealed] = useState(false);
  const cash = account.balances.find((b) => b.tokenId === USDC.assetId);
  const holdings = account.balances
    .filter((b) => b.tokenId !== USDC.assetId)
    .map((b) => ({ ...b, asset: CANDIDATE_ASSETS.find((a) => a.assetId === b.tokenId) }));

  return (
    <div className="pb-16">
      <section className="pt-10">
        <div className="flex items-center gap-2 text-[13px] text-ink-60">
          <span className="h-[7px] w-[7px] rounded-full bg-gold" />
          Private cash
        </div>
        <div className="veil tabular mt-1.5 text-[56px] leading-none tracking-[-0.045em]" data-revealed={revealed}>
          {formatUnits(cash?.available ?? "0", USDC.decimals).toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </div>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-60 transition-opacity hover:opacity-70"
        >
          <RevealIcon size={16} />
          {revealed ? "Hide balances" : "Reveal balances"}
        </button>
        {!account.balancesAvailable && (
          <p className="mt-3 text-sm text-down">Balances couldn&apos;t be loaded from NEAR Intents just now.</p>
        )}
      </section>

      <section className="mt-8 border border-hairline bg-paper">
        <div className="flex justify-between px-4 pb-1.5 pt-3.5 text-[13px] text-ink-60">
          <span>Investments</span>
          <Link href="/app/invest" className="underline-offset-4 hover:underline">
            Browse
          </Link>
        </div>
        {holdings.length === 0 ? (
          <p className="border-t border-hairline px-4 py-4 text-sm text-ink-60">You don&apos;t hold any investments yet.</p>
        ) : (
          holdings.map((h) => (
            <div key={h.tokenId} className="flex justify-between gap-4 border-t border-hairline px-4 py-3 text-sm">
              <span className="truncate">{h.asset ? `${h.asset.name} · ${h.asset.symbol}` : h.tokenId}</span>
              <span className="veil tabular" data-revealed={revealed}>
                {h.asset ? formatUnits(h.available, h.asset.decimals).toFixed(4) : h.available}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="mt-6 border border-hairline bg-paper p-6">
        <div className="text-lg tracking-[-0.015em]">Your private account is open</div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-60">
          You&apos;re signed in to NEAR Confidential Intents with your passkey, and the balances above are read live
          from your confidential account. Adding money and sending are being built next.
        </p>
        <p className="mt-4 text-xs text-ink-45">
          Account id: <span className="tabular break-all">{account.signerId}</span>
        </p>
      </section>
    </div>
  );
}
