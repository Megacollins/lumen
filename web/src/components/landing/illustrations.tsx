/** Line drawings for "How it works" and the sealed case for the privacy section (DESIGN.md, hero series 03). */

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

/** A closed slate case with warm light escaping from its seam: what's inside stays inside. */
export function SealedCase({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 440"
      className={className}
      role="img"
      aria-label="A closed slate-grey case with a thin line of warm light escaping from its seam"
    >
      <defs>
        <radialGradient id="case-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0DFAE" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="case-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A3936" />
          <stop offset="100%" stopColor="#1C1B19" />
        </linearGradient>
        <linearGradient id="case-seam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E9CF86" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFF1C4" />
          <stop offset="100%" stopColor="#E9CF86" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="240" cy="236" rx="230" ry="150" fill="url(#case-glow)" />
      <ellipse cx="240" cy="372" rx="170" ry="14" fill="#141413" opacity="0.1" />
      <rect x="90" y="150" width="300" height="210" fill="url(#case-body)" />
      <polygon points="90,150 130,118 430,118 390,150" fill="#4A4945" />
      <polygon points="390,150 430,118 430,328 390,360" fill="#262523" />
      <rect x="90" y="226" width="300" height="3" fill="url(#case-seam)" />
      <polygon points="390,227 430,195 430,198 390,230" fill="#E9CF86" opacity="0.7" />
      <rect x="222" y="244" width="36" height="22" fill="none" stroke="#6B6A65" strokeWidth="1.5" />
    </svg>
  );
}
