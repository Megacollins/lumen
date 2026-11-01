"use client";

import { useState } from "react";
import { RevealIcon } from "@/components/brand/icons";

const CASH = [{ label: "US dollars", sub: "USDC", value: 4210.0 }];
const INVESTMENTS = [
  { label: "NVIDIA", sub: "NVDA · stock", value: 3120.4 },
  { label: "SPDR Gold Shares", sub: "GLD · gold ETF", value: 5149.8 },
];
const cash = CASH.reduce((s, r) => s + r.value, 0);
const invested = INVESTMENTS.reduce((s, r) => s + r.value, 0);
const total = cash + invested;
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Illustrative account card for the hero: one balance, split into cash and investments. Example values, labelled. */
export function AccountPreview() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="w-[min(340px,calc(100vw-32px))] border border-hairline bg-paper p-5 text-left">
      <div className="flex items-center justify-between text-[13px] text-ink-60">
        <span className="flex items-center gap-2">
          <span className="h-[7px] w-[7px] rounded-full bg-gold" />
          Net worth
        </span>
        <span className="border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Example</span>
      </div>
      <div className="veil tabular mt-2 text-[40px] leading-none tracking-[-0.04em]" data-revealed={revealed}>
        {usd(total)}
      </div>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-60 transition-opacity hover:opacity-70"
        aria-pressed={revealed}
      >
        <RevealIcon size={16} />
        {revealed ? "Hide balances" : "Reveal balances"}
      </button>

      <div className="mt-4 flex h-1.5 w-full" aria-hidden>
        <span className="bg-ink" style={{ width: `${(cash / total) * 100}%` }} />
        <span className="bg-gold" style={{ width: `${(invested / total) * 100}%` }} />
      </div>

      {[
        { title: "Cash", dot: "bg-ink", rows: CASH },
        { title: "Investments", dot: "bg-gold", rows: INVESTMENTS },
      ].map((g) => (
        <div key={g.title} className="mt-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-45">
            <span className={`h-1.5 w-1.5 ${g.dot}`} />
            {g.title}
          </div>
          <div className="mt-1 divide-y divide-hairline">
            {g.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{r.label}</span>
                  <span className="block text-xs text-ink-45">{r.sub}</span>
                </span>
                <span className="veil tabular" data-revealed={revealed}>
                  {usd(r.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
