// USDC routes for adding and withdrawing cash. Asset ids come from the 1Click token list.
export const CHAINS = [
  { id: "near", name: "NEAR", assetId: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", address: "near" },
  { id: "base", name: "Base", assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", address: "evm" },
  { id: "eth", name: "Ethereum", assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", address: "evm" },
  { id: "arb", name: "Arbitrum", assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", address: "evm" },
  { id: "sol", name: "Solana", assetId: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near", address: "sol" },
] as const;

export type ChainId = (typeof CHAINS)[number]["id"];
export type CashKind = "add" | "send" | "withdraw";

/**
 * Cash flows whose real execution has passed a live mainnet test (spikes/spike2-deposit.ts, spike3-send.ts).
 * Empty until those tests run: until then Lumen shows real quotes but moves no money.
 */
export const CASH_VERIFIED = new Set<CashKind>();

const NEAR_ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** A NEAR Intents account id: 0x + 40 hex (EVM, passkey), 64 hex (implicit), or a named NEAR account. */
export function isIntentsAccount(s: string) {
  return /^0x[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s) || (NEAR_ACCOUNT.test(s) && s.length >= 2 && s.length <= 64);
}

export function isChainAddress(kind: "near" | "evm" | "sol", s: string) {
  if (kind === "evm") return /^0x[0-9a-fA-F]{40}$/.test(s);
  if (kind === "sol") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
  return isIntentsAccount(s);
}
