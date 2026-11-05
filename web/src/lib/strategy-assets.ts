import { CANDIDATE_ASSETS, USDC } from "./markets";

/** What a strategy can allocate to: cash (USDC) and Lumen's tokenized assets. Shared by server and browser. */
export const STRATEGY_ASSETS = [
  { symbol: "USDC", name: "US dollars (cash)", kind: "Cash", assetId: USDC.assetId, decimals: USDC.decimals },
  ...CANDIDATE_ASSETS,
];

export const assetName = (symbol: string) => STRATEGY_ASSETS.find((a) => a.symbol === symbol)?.name ?? symbol;

export const pct = (r: number | null, digits = 2) => (r == null ? "—" : `${r >= 0 ? "+" : "−"}${Math.abs(r * 100).toFixed(digits)}%`);

export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
