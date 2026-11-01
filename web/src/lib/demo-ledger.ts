import { CANDIDATE_ASSETS, USDC } from "./markets";

// Demo mode's simulated account. Lives only in this browser; nothing here touches NEAR Intents.
const KEY = "lumen.demo.v1";

export type ActivityKind = "add" | "send" | "withdraw" | "buy" | "sell" | "receive";

export type Receipt = {
  id: string;
  at: number;
  kind: ActivityKind;
  title: string;
  detail: string;
  /** Signed USDC change, for the activity list. */
  cashDelta: number;
};

export type Ledger = {
  /** Asset id → amount in whole units (e.g. 2500.5 USDC, 0.25 NVDA). */
  balances: Record<string, number>;
  activity: Receipt[];
};

const nvda = CANDIDATE_ASSETS.find((a) => a.symbol === "NVDA")!;
const gld = CANDIDATE_ASSETS.find((a) => a.symbol === "GLD")!;

export function freshLedger(): Ledger {
  const now = Date.now();
  return {
    balances: { [USDC.assetId]: 2480.2, [nvda.assetId]: 3.2, [gld.assetId]: 4 },
    activity: [
      { id: "seed-2", at: now - 3 * 3600_000, kind: "buy", title: "Bought Gold", detail: "4.0000 GLD", cashDelta: -1420.0 },
      { id: "seed-1", at: now - 26 * 3600_000, kind: "receive", title: "Received from @maya", detail: "Private payment", cashDelta: 250 },
    ],
  };
}

export function loadLedger(): Ledger {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Ledger;
  } catch {}
  return freshLedger();
}

export function saveLedger(l: Ledger) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {}
}

export function clearLedger() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Applies balance changes and records a receipt. Refuses to take any balance below zero. */
export function applyToLedger(l: Ledger, deltas: Record<string, number>, receipt: Omit<Receipt, "id" | "at">): Ledger | null {
  const balances = { ...l.balances };
  for (const [id, d] of Object.entries(deltas)) {
    const next = (balances[id] ?? 0) + d;
    if (next < -1e-9) return null;
    balances[id] = Math.max(0, next);
  }
  const r: Receipt = { ...receipt, id: crypto.randomUUID(), at: Date.now() };
  return { balances, activity: [r, ...l.activity].slice(0, 50) };
}

/** Ledger balances in the same shape NEAR Intents returns, so screens read demo and real accounts alike. */
export function ledgerBalances(l: Ledger) {
  const decimalsOf = (id: string) => (id === USDC.assetId ? USDC.decimals : CANDIDATE_ASSETS.find((a) => a.assetId === id)?.decimals ?? 18);
  return Object.entries(l.balances)
    .filter(([, v]) => v > 0)
    .map(([tokenId, v]) => ({
      tokenId,
      available: BigInt(Math.round(v * 1e6)).toString() + "0".repeat(Math.max(0, decimalsOf(tokenId) - 6)),
    }));
}
