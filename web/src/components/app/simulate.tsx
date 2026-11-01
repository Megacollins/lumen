"use client";

import { Check } from "lucide-react";
import { useState } from "react";

/**
 * Demo-mode action: applies a quoted transaction to the simulated ledger.
 * Always labelled as a simulation; it never signs or sends anything.
 */
export function SimulateButton({ label, run, onDone }: { label: string; run: () => boolean; onDone: () => void }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  if (state === "done")
    return (
      <div className="mt-6 border border-hairline bg-mist p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
          <Check size={20} strokeWidth={1.75} />
        </span>
        <p className="mt-3 font-medium">Simulated</p>
        <p className="mt-1 text-sm text-ink-60">Your demo balance is updated. No real transaction was made.</p>
        <button type="button" onClick={onDone} className="mt-4 h-11 w-full border border-ink font-medium transition-opacity hover:opacity-70">
          Done
        </button>
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setState(run() ? "done" : "failed")}
        className="mt-6 h-[52px] w-full bg-ink font-medium text-white transition-opacity hover:opacity-70"
      >
        {label}
      </button>
      <p className="mt-2 text-center text-xs text-ink-45">Demo: uses this real quote, moves no real money.</p>
      {state === "failed" && <p className="mt-2 text-center text-sm text-down">Not enough in your demo balance.</p>}
    </>
  );
}
