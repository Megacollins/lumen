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
  {
    symbol: "NVDA",
    name: "NVIDIA",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3.omdep.near",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x4553cfe1c09f37f38b12dc509f676964e392f8fc.omdep.near",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet (Google)",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x091fc7778e6932d4009b087b191d1ee3bac5729a.omdep.near",
  },
  {
    symbol: "META",
    name: "Meta",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0xd7df5863a3e742f0c767768cdfcb63f09e0422f6.omdep.near",
  },
  {
    symbol: "INTC",
    name: "Intel",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0xa528caaa2f96090e379d43f90834c75df54d6e74.omdep.near",
  },
  {
    symbol: "MRVL",
    name: "Marvell",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x1501ec83ffef405b4331cc4f73277a40fb0c627d.omdep.near",
  },
  {
    symbol: "CRCL",
    name: "Circle",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x992879cd8ce0c312d98648875b5a8d6d042cbf34.omdep.near",
  },
  {
    symbol: "HOOD",
    name: "Robinhood",
    kind: "Stock",
    decimals: 18,
    assetId: "nep141:bnb-0x19601179a60f55ff6636f5d1a8b6671053bd60a8.omdep.near",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ",
    kind: "ETF",
    decimals: 18,
    assetId: "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near",
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500",
    kind: "ETF",
    decimals: 18,
    assetId: "nep141:bnb-0x6a708ead771238919d85930b5a0f10454e1c331a.omdep.near",
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    kind: "Gold ETF",
    decimals: 18,
    assetId: "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near",
  },
  {
    symbol: "IAU",
    name: "iShares Gold Trust",
    kind: "Gold ETF",
    decimals: 18,
    assetId: "nep141:bnb-0xcb2a0f46f67dc4c58a316f1c008edef5c2311795.omdep.near",
  },
  {
    symbol: "SLV",
    name: "iShares Silver Trust",
    kind: "Silver ETF",
    decimals: 18,
    assetId: "nep141:bnb-0x8b872732b07be325a8803cdb480d9d20b6f8d11b.omdep.near",
  },
] as const;

/** The five shown on the landing page; the app lists them all. */
export const FEATURED_SYMBOLS = ["NVDA", "TSLA", "AAPL", "QQQ", "GLD"] as const;

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
    const stamps = CANDIDATE_ASSETS.map((a) => byId.get(a.assetId)?.priceUpdatedAt)
      .filter((x): x is string => !!x)
      .sort();
    return { rows, live: true, updatedAt: stamps.at(-1) ?? null };
  } catch {
    return { rows: CANDIDATE_ASSETS.map((a) => ({ ...a, price: null, listed: false, tradable: false })), live: false, updatedAt: null };
  }
}

/** Integer base units → exact decimal string (no floating point), trailing zeros trimmed: "5200384443024744206", 18 → "5.200384443024744206". */
export function fromBaseUnits(base: string | bigint, decimals: number): string {
  const v = BigInt(base);
  const neg = v < BigInt(0);
  const digits = (neg ? -v : v).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return (neg ? "-" : "") + whole + (frac ? "." + frac : "");
}

/** Decimal string → integer base units, without floating-point rounding. */
export function toBaseUnits(amount: string, decimals: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}
