"use client";

import { useState } from "react";
import { RevealIcon } from "@/components/brand/icons";

/** Illustrative account card for the hero. The amounts are example values, labelled as such. */
export function AccountPreview() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="w-[300px] border border-hairline bg-paper p-5 text-left sm:w-[320px]">
      <div className="flex items-center justify-between text-[13px] text-ink-60">
        <span className="flex items-center gap-2">
          <span className="h-[7px] w-[7px] rounded-full bg-gold" />
          Private balance
        </span>
        <span>Example</span>
      </div>
      <div className="veil tabular mt-2 text-[40px] leading-none tracking-[-0.04em]" data-revealed={revealed}>
        $12,480.20
      </div>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-60 transition-opacity hover:opacity-70"
        aria-pressed={revealed}
      >
        <RevealIcon size={16} />
        {revealed ? "Hide balance" : "Reveal balance"}
      </button>
      <div className="mt-4 divide-y divide-hairline border-t border-hairline text-sm">
        {[
          ["Cash", "$4,210.00"],
          ["NVIDIA", "$3,120.40"],
          ["Gold", "$5,149.80"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2.5">
            <span>{label}</span>
            <span className="veil tabular" data-revealed={revealed}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
