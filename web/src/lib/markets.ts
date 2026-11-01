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
  { symbol: "QQQ", name: "Nasdaq-100", kind: "Fund", decimals: 18, assetId: "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near" },
  { symbol: "GLD", name: "Gold", kind: "Gold fund", decimals: 18, assetId: "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near" },
] as const;

export type Asset = (typeof CANDIDATE_ASSETS)[number];
export type MarketRow = Asset & { price: number | null; tradable: boolean };

/**
 * Symbols whose confidential buy AND sell have been executed for real on mainnet (spikes/spike4-roundtrip.ts).
 * Empty until that test runs: until then Lumen shows real quotes but does not execute orders.
 */
export const EXECUTION_VERIFIED = new Set<string>();

export function findAsset(symbol: string): Asset | undefined {
  return CANDIDATE_ASSETS.find((a) => a.symbol === symbol.toUpperCase());
}

/** Live prices from the 1Click token list. Returns null prices (never invented ones) if the API is unreachable. */
export async function getMarketRows(): Promise<{ rows: MarketRow[]; live: boolean }> {
  try {
    const res = await fetch(`${ONECLICK}/v0/tokens?ondoTokens=true`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    const tokens: { assetId: string; price?: number }[] = await res.json();
    const byId = new Map(tokens.map((t) => [t.assetId, t.price ?? null]));
    return {
      rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: byId.get(a.assetId) ?? null, tradable: EXECUTION_VERIFIED.has(a.symbol) })),
      live: true,
    };
  } catch {
    return { rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: null, tradable: false })), live: false };
  }
}

/** Decimal string → integer base units, without floating-point rounding. */
export function toBaseUnits(amount: string, decimals: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}
