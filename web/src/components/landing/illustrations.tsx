/** Line drawings for "How it works". */

import type { ReactNode } from "react";

const GOLD = "#C9A24A";

function Step({ children }: { children: ReactNode }) {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      {children}
    </svg>
  );
}

/** A box with money arriving from above; the gold mark is the private balance. */
export function StepAdd() {
  return (
    <Step>
      <rect x="30" y="34" width="80" height="80" />
      <rect x="42" y="46" width="56" height="56" strokeOpacity="0.35" />
      <path d="M70 10 V64" />
      <path d="M58 52 L70 64 L82 52" />
      <rect x="66" y="88" width="8" height="2" fill={GOLD} stroke="none" />
    </Step>
  );
}

/** Two accounts joined by a dotted path that isn't on public display. */
export function StepSend() {
  return (
    <Step>
      <rect x="14" y="48" width="44" height="44" />
      <rect x="82" y="48" width="44" height="44" />
      <path d="M58 70 H82" strokeDasharray="3 4" />
      <path d="M74 62 L82 70 L74 78" />
      <circle cx="36" cy="70" r="3" fill="currentColor" stroke="none" />
      <circle cx="104" cy="70" r="3" fill={GOLD} stroke="none" />
    </Step>
  );
}

/** A chart rising inside a closed frame. */
export function StepInvest() {
  return (
    <Step>
      <rect x="20" y="24" width="100" height="92" />
      <path d="M34 98 L58 74 L74 86 L106 50" />
      <path d="M94 50 H106 V62" />
      <path d="M34 106 H106" strokeOpacity="0.35" />
      <rect x="102" y="46" width="8" height="8" fill={GOLD} stroke="none" />
    </Step>
  );
}
