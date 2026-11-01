const ONECLICK = "https://1click.chaindefuser.com";

export const USDC = {
  symbol: "USDC",
  assetId: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  decimals: 6,
} as const;

/** Orders below this fail with "No liquidity available" (measured Oct 25: $25 failed, $30 quoted). */
export const MIN_ORDER_USD = 30;

/**
 * Assets Lumen intends to offer. `assetId` is the 1Click id (Ondo tokens are BNB Chain-backed `omdep` assets).
 * Listing here does NOT mean trading is enabled: see EXECUTION_VERIFIED.
 */
export const CANDIDATE_ASSETS = [
  { symbol: "NVDA", name: "NVIDIA", kind: "Stock", decimals: 18, assetId: "nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near" },
  { symbol: "TSLA", name: "Tesla", kind: "Stock", decimals: 18, assetId: "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near" },
  { symbol: "AAPL", name: "Apple", kind: "Stock", decimals: 18, assetId: "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near" },
  { symbol: "QQQ", name: "Invesco QQQ", kind: "ETF", decimals: 18, assetId: "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near" },
  { symbol: "GLD", name: "SPDR Gold Shares", kind: "Gold ETF", decimals: 18, assetId: "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near" },
] as const;

export type Asset = (typeof CANDIDATE_ASSETS)[number];
/** `listed`: present in the NEAR Intents token list right now. `price` is that list's indicative USD price, not a quote. */
export type MarketRow = Asset & { price: number | null; listed: boolean; tradable: boolean };

/**
 * Symbols whose confidential buy AND sell have been executed for real on mainnet (spikes/spike4-roundtrip.ts).
 * Empty until that test runs: until then Lumen shows real quotes but does not execute orders.
 */
export const EXECUTION_VERIFIED = new Set<string>();

export function findAsset(symbol: string): Asset | undefined {
  return CANDIDATE_ASSETS.find((a) => a.symbol === symbol.toUpperCase());
}

/**
 * Indicative prices from the 1Click token list, with each asset's listing checked against it.
 * Returns null prices (never invented ones) if the API is unreachable. `updatedAt` is the list's own price timestamp.
 */
export async function getMarketRows(): Promise<{ rows: MarketRow[]; live: boolean; updatedAt: string | null }> {
  try {
    const res = await fetch(`${ONECLICK}/v0/tokens?ondoTokens=true`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    const tokens: { assetId: string; price?: number; priceUpdatedAt?: string }[] = await res.json();
    const byId = new Map(tokens.map((t) => [t.assetId, t]));
    const rows = CANDIDATE_ASSETS.map((a) => {
      const t = byId.get(a.assetId);
      return { ...a, price: t?.price ?? null, listed: !!t, tradable: !!t && EXECUTION_VERIFIED.has(a.symbol) };
    });
    const stamps = CANDIDATE_ASSETS.map((a) => byId.get(a.assetId)?.priceUpdatedAt).filter((x): x is string => !!x).sort();
    return { rows, live: true, updatedAt: stamps.at(-1) ?? null };
  } catch {
    return { rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: null, listed: false, tradable: false })), live: false, updatedAt: null };
  }
}

/** Decimal string → integer base units, without floating-point rounding. */
export function toBaseUnits(amount: string, decimals: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}
