"use client";

import Link from "next/link";
import { useState } from "react";
import { RevealIcon } from "@/components/brand/icons";
import { CANDIDATE_ASSETS, USDC } from "@/lib/markets";
import { revealByDefault } from "@/lib/prefs";
import { useAccount } from "./account-app";
import { usd, useMarkets } from "./use-markets";

const units = (base: string, decimals: number) => Number(base) / 10 ** decimals;

function timeAgo(at: number) {
  const m = Math.round((Date.now() - at) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export function Overview() {
  const { account, activity } = useAccount();
  const markets = useMarkets();
  const [revealed, setRevealed] = useState(revealByDefault);

  const cash = units(account.balances.find((b) => b.tokenId === USDC.assetId)?.available ?? "0", USDC.decimals);
  const holdings = account.balances
    .filter((b) => b.tokenId !== USDC.assetId)
    .map((b) => {
      const asset = CANDIDATE_ASSETS.find((a) => a.assetId === b.tokenId);
      const qty = asset ? units(b.available, asset.decimals) : 0;
      const price = asset ? markets?.rows.find((r) => r.symbol === asset.symbol)?.price ?? null : null;
      return { tokenId: b.tokenId, asset, qty, value: price == null ? null : qty * price };
    });
  const invested = holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const pricesMissing = holdings.some((h) => h.value == null);
  const total = cash + invested;

  return (
    <div className="pb-16">
      <section className="pt-10">
        <div className="flex items-center gap-2 text-[13px] text-ink-60">
          <span className="h-[7px] w-[7px] rounded-full bg-gold" />
          Net worth{account.demo ? " · demo" : ""}
        </div>
        <div className="veil tabular mt-1.5 text-[56px] leading-none tracking-[-0.045em]" data-revealed={revealed}>
          {usd(total)}
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
        {!account.balancesAvailable && <p className="mt-3 text-sm text-down">Balances couldn&apos;t be loaded from NEAR Intents just now.</p>}
        {pricesMissing && <p className="mt-3 text-xs text-ink-45">Some prices are unavailable, so the total may be low.</p>}

        {total > 0 && (
          <div className="mt-6 flex h-1.5 w-full max-w-[520px]">
            <span className="bg-ink" style={{ width: `${(cash / total) * 100}%` }} />
            <span className="bg-gold" style={{ width: `${(invested / total) * 100}%` }} />
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="border border-hairline bg-paper">
          <div className="flex justify-between px-4 pb-1.5 pt-3.5 text-[13px] text-ink-60">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 bg-ink" /> Cash
            </span>
            <Link href="/app/cash" className="underline-offset-4 hover:underline">
              Open
            </Link>
          </div>
          <div className="flex justify-between border-t border-hairline px-4 py-3 text-sm">
            <span>USDC</span>
            <span className="veil tabular" data-revealed={revealed}>
              {usd(cash)}
            </span>
          </div>
        </section>

        <section className="border border-hairline bg-paper">
          <div className="flex justify-between px-4 pb-1.5 pt-3.5 text-[13px] text-ink-60">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 bg-gold" /> Investments
            </span>
            <Link href="/app/invest" className="underline-offset-4 hover:underline">
              Browse
            </Link>
          </div>
          {holdings.length === 0 ? (
            <p className="border-t border-hairline px-4 py-3 text-sm text-ink-60">You don&apos;t hold any investments yet.</p>
          ) : (
            holdings.map((h) => (
              <Link
                key={h.tokenId}
                href={h.asset ? `/app/invest/${h.asset.symbol}` : "/app/invest"}
                className="flex justify-between gap-4 border-t border-hairline px-4 py-3 text-sm transition-colors hover:bg-mist"
              >
                <span className="truncate">{h.asset ? h.asset.name : h.tokenId}</span>
                <span className="veil tabular text-right" data-revealed={revealed}>
                  {h.value == null ? "—" : usd(h.value)}
                  <span className="ml-2 text-ink-45">{h.qty.toFixed(4)}</span>
                </span>
              </Link>
            ))
          )}
        </section>
      </div>

      <section className="mt-4 border border-hairline bg-paper">
        <div className="px-4 pb-1.5 pt-3.5 text-[13px] text-ink-60">Recent activity</div>
        {activity.length === 0 ? (
          <p className="border-t border-hairline px-4 py-3 text-sm text-ink-60">
            {account.demo ? "No demo activity yet." : "Your transactions will appear here once adding money and investing open."}
          </p>
        ) : (
          activity.slice(0, 6).map((r) => (
            <div key={r.id} className="flex justify-between gap-4 border-t border-hairline px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate">{r.title}</div>
                <div className="text-xs text-ink-45">
                  {timeAgo(r.at)} · {r.detail}
                  {account.demo ? " · simulated" : ""}
                </div>
              </div>
              <span className={`veil tabular ${r.cashDelta > 0 ? "text-up" : ""}`} data-revealed={revealed}>
                {r.cashDelta > 0 ? "+" : "−"}
                {usd(Math.abs(r.cashDelta))}
              </span>
            </div>
          ))
        )}
      </section>

      {!account.demo && (
        <p className="mt-6 text-xs text-ink-45">
          Account id: <span className="tabular break-all">{account.signerId}</span>
        </p>
      )}
    </div>
  );
}
