// One definition of every order Lumen can place, shared by the preview quotes and real execution,
// so what a user is shown is exactly what they sign.
import { CASH_VERIFIED, CHAINS, isChainAddress, isIntentsAccount, type CashKind } from "@/lib/cash";
import { EXECUTION_VERIFIED, findAsset, MIN_ORDER_USD, toBaseUnits, USDC } from "@/lib/markets";
import { isNamedNearAccount, nearAccountExists } from "./near";

export type OrderSpec =
  | { flow: "trade"; symbol: string; side: "buy" | "sell"; amount: string }
  | { flow: "cash"; kind: CashKind; amount: string; chain?: string; recipient?: string };

export type BuiltOrder = {
  /** 1Click /v0/quote body without `dry`. */
  body: Record<string, unknown>;
  /** Decimals of the asset the user receives (for minAmountOut). */
  outDecimals: number;
  /** "add" deposits arrive from another chain; everything else is signed from the user's Intents balance. */
  signed: boolean;
  /** Has this exact flow passed its live mainnet test? */
  verified: boolean;
  /** Short human summary for receipts. */
  summary: string;
  /** Where the money goes, when it isn't back to the signer (send, move out). */
  recipient?: string;
  /** The recipient is a named NEAR account that must exist (send, or move out to NEAR). */
  recipientMustExist?: boolean;
};

/** USDC's own token contracts on every chain Lumen supports: never a valid place to send money. */
const TOKEN_CONTRACTS = new Set([
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", // NEAR
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Ethereum
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // Arbitrum
  "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v", // Solana (mint, compared lowercased)
]);

/** Confidential Intents needs the partner key; without it quotes use the public Intents route. */
export const confidential = () => !!process.env.ONECLICK_JWT;

/**
 * Real orders are allowed only for flows that passed a live mainnet test AND run confidentially.
 * A local dev server may run unverified flows (LUMEN_DEV_EXECUTION=1) to test the pipeline itself.
 */
export const devExecution = () => process.env.NODE_ENV !== "production" && process.env.LUMEN_DEV_EXECUTION === "1";

export function executionAllowed(o: BuiltOrder) {
  if (devExecution()) return true;
  return o.verified && confidential();
}

const BLOCKED_COUNTRIES = new Set(["US"]);

export function buildOrder(spec: OrderSpec, signerId: string, country: string | null): BuiltOrder | { error: string; status: number } {
  const t = confidential() ? "CONFIDENTIAL_INTENTS" : "INTENTS";
  const common = { swapType: "EXACT_INPUT", slippageTolerance: 100, confidentiality: confidential() ? "basic" : "public" };

  if (spec.flow === "trade") {
    // Tokenized stocks are not offered to US persons. On Vercel the request country arrives in a header.
    if (country && BLOCKED_COUNTRIES.has(country)) return { error: "Tokenized stocks aren't available in your country.", status: 451 };
    const asset = findAsset(spec.symbol);
    if (!asset || (spec.side !== "buy" && spec.side !== "sell") || !spec.amount)
      return { error: "Choose an asset, a side and an amount.", status: 400 };
    const from = spec.side === "buy" ? USDC : asset;
    const to = spec.side === "buy" ? asset : USDC;
    const base = toBaseUnits(spec.amount, from.decimals);
    if (base == null || base <= BigInt(0)) return { error: "Enter a valid amount.", status: 400 };
    if (spec.side === "buy" && Number(spec.amount) < MIN_ORDER_USD)
      return { error: `The minimum order is $${MIN_ORDER_USD}.`, status: 422 };
    return {
      body: {
        ...common,
        originAsset: from.assetId,
        destinationAsset: to.assetId,
        amount: base.toString(),
        depositType: t,
        recipient: signerId,
        recipientType: t,
        refundTo: signerId,
        refundType: t,
      },
      outDecimals: to.decimals,
      signed: true,
      verified: EXECUTION_VERIFIED.has(asset.symbol),
      summary: spec.side === "buy" ? `Buy ${asset.name} with $${spec.amount}` : `Sell ${spec.amount} ${asset.symbol}`,
    };
  }

  const base = spec.amount ? toBaseUnits(spec.amount, USDC.decimals) : null;
  if (!base || base <= BigInt(0)) return { error: "Enter an amount.", status: 400 };
  const amount = { ...common, amount: base.toString() };

  if (spec.kind === "add") {
    const c = CHAINS.find((x) => x.id === spec.chain);
    if (!c) return { error: "Choose where the money comes from.", status: 400 };
    return {
      body: { ...amount, originAsset: c.assetId, depositType: "ORIGIN_CHAIN", destinationAsset: USDC.assetId, recipient: signerId, recipientType: t, refundTo: signerId, refundType: t },
      outDecimals: USDC.decimals,
      signed: false,
      verified: CASH_VERIFIED.has("add"),
      summary: `Add ${spec.amount} USDC from ${c.name}`,
    };
  }
  if (spec.kind === "send") {
    const to = spec.recipient?.trim().toLowerCase() ?? "";
    if (!isIntentsAccount(to)) return { error: "Enter a Lumen or NEAR Intents account id.", status: 400 };
    if (to === signerId) return { error: "That's your own account.", status: 400 };
    return {
      body: { ...amount, originAsset: USDC.assetId, depositType: t, destinationAsset: USDC.assetId, recipient: to, recipientType: t, refundTo: signerId, refundType: t },
      outDecimals: USDC.decimals,
      signed: true,
      verified: CASH_VERIFIED.has("send"),
      summary: `Send ${spec.amount} USDC to ${to}`,
      recipient: to,
      recipientMustExist: isNamedNearAccount(to),
    };
  }
  if (spec.kind === "withdraw") {
    const c = CHAINS.find((x) => x.id === spec.chain);
    const to = spec.recipient?.trim() ?? "";
    if (!c) return { error: "Choose a network.", status: 400 };
    if (!isChainAddress(c.address, to)) return { error: `Enter a valid ${c.name} address.`, status: 400 };
    if (TOKEN_CONTRACTS.has(to.toLowerCase()))
      return { error: "That's a token contract, not a wallet. Money sent there can't be recovered.", status: 400 };
    return {
      body: { ...amount, originAsset: USDC.assetId, depositType: t, destinationAsset: c.assetId, recipient: to, recipientType: "DESTINATION_CHAIN", refundTo: signerId, refundType: t },
      outDecimals: USDC.decimals,
      signed: true,
      verified: CASH_VERIFIED.has("withdraw"),
      summary: `Move ${spec.amount} USDC out to ${c.name}`,
      recipient: to,
      recipientMustExist: c.address === "near" && isNamedNearAccount(to.toLowerCase()),
    };
  }
  return { error: "Unknown action.", status: 400 };
}

/**
 * A named NEAR recipient must exist: money sent to a name nobody has created yet can't come back, and whoever creates
 * that name later would receive it. Implicit accounts (0x…, 64 hex) can't be checked, so the app shows them in full
 * for confirmation before signing.
 */
export async function checkRecipient(o: BuiltOrder): Promise<{ error: string; status: number } | null> {
  if (!o.recipientMustExist || !o.recipient) return null;
  const exists = await nearAccountExists(o.recipient.toLowerCase());
  if (exists === null) return { error: "Couldn't check that NEAR account just now. Try again.", status: 502 };
  return exists ? null : { error: `${o.recipient} doesn't exist on NEAR. Check the name.`, status: 422 };
}

/** Turns 1Click quote errors into messages a user can act on. */
export function quoteErrorMessage(message: string) {
  if (/liquidity/i.test(message)) return { error: "No quote for this amount right now. Try another amount or later.", status: 422 };
  if (/recipient/i.test(message)) return { error: "NEAR Intents didn't accept that recipient.", status: 422 };
  return { error: "Couldn't get a quote from NEAR Intents. Try again.", status: 502 };
}
