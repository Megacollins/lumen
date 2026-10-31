const ONECLICK = "https://1click.chaindefuser.com";

/**
 * Assets Lumen intends to offer. `assetId` is the 1Click id (Ondo tokens are BNB Chain-backed `omdep` assets).
 * Listing here does NOT mean trading is enabled: an asset is tradable only after a real quote passes (see spikes/).
 */
export const CANDIDATE_ASSETS = [
  { symbol: "NVDA", name: "NVIDIA", kind: "Stock", assetId: "nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near" },
  { symbol: "TSLA", name: "Tesla", kind: "Stock", assetId: "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near" },
  { symbol: "AAPL", name: "Apple", kind: "Stock", assetId: "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near" },
  { symbol: "QQQ", name: "Nasdaq-100", kind: "Fund", assetId: "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near" },
  { symbol: "GLD", name: "Gold", kind: "Gold fund", assetId: "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near" },
] as const;

export type MarketRow = (typeof CANDIDATE_ASSETS)[number] & { price: number | null };

/** Live prices from the 1Click token list. Returns null prices (never invented ones) if the API is unreachable. */
export async function getMarketRows(): Promise<{ rows: MarketRow[]; live: boolean }> {
  try {
    const res = await fetch(`${ONECLICK}/v0/tokens?ondoTokens=true`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    const tokens: { assetId: string; price?: number }[] = await res.json();
    const byId = new Map(tokens.map((t) => [t.assetId, t.price ?? null]));
    return {
      rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: byId.get(a.assetId) ?? null })),
      live: true,
    };
  } catch {
    return { rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: null })), live: false };
  }
}
