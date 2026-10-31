import { IntentsSDK, VersionedNonceBuilder } from "@defuse-protocol/intents-sdk";
import { base58 } from "@scure/base";
import { hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { api, LIVE, quote, step, waitForStatus } from "./oneclick.js";

const sdk = new IntentsSDK({ referral: "lumen", env: "production" });

export type Signer = {
  signerId: string;
  standard: "erc191";
  /** Signs a payload string, returns the `signedData` MultiPayload. */
  sign(payload: string): Promise<Record<string, unknown>>;
};

/** Normalises a 65-byte EVM signature (v = 27/28 → 0/1) into Intents' `secp256k1:<base58>` form. */
export function erc191Signature(hex: `0x${string}`): string {
  const b = hexToBytes(hex);
  if (b.length !== 65) throw new Error(`unexpected signature length ${b.length}`);
  if (b[64] >= 27) b[64] -= 27;
  return "secp256k1:" + base58.encode(b);
}

export function evmAccount(pk: string): Signer {
  const acct = privateKeyToAccount(pk as `0x${string}`);
  return {
    signerId: acct.address.toLowerCase(),
    standard: "erc191",
    async sign(payload) {
      const sig = await acct.signMessage({ message: payload });
      return { standard: "erc191", payload, signature: erc191Signature(sig) };
    },
  };
}

/**
 * Builds the empty-intent ownership proof as the exact string to sign.
 * Field order matches the SDK's own signers.
 */
export async function emptyIntentPayload(signerId: string): Promise<string> {
  const p = await sdk
    .intentBuilder()
    .setSigner(signerId)
    .setDeadline(new Date(Date.now() + 5 * 60_000))
    .setNonceRandomBytes(VersionedNonceBuilder.createTimestampedNonceBytes(new Date()))
    .build();
  return JSON.stringify({
    signer_id: p.signer_id,
    verifying_contract: p.verifying_contract,
    deadline: p.deadline,
    nonce: p.nonce,
    intents: p.intents,
  });
}

export type Session = { accessToken: string; refreshToken: string; expiresIn: number };

/** Exchanges a signed empty intent for a User-Session token (needed for confidential quotes and balances). */
export async function authenticateSigned(signedData: Record<string, unknown>): Promise<Session> {
  return api<Session>("/v0/auth/authenticate", { body: { signedData } });
}

export async function authenticate(s: Signer): Promise<Session> {
  return authenticateSigned(await s.sign(await emptyIntentPayload(s.signerId)));
}

export async function balances(userToken: string) {
  return (await api<{ balances: any[] }>("/v0/account/balances", { userToken })).balances;
}

export function printBalances(list: any[]) {
  if (!list.length) return console.log("  (no balances)");
  for (const b of list) console.log(`  ${JSON.stringify(b)}`);
}

/**
 * Swap (or same-asset transfer) entirely inside Confidential Intents:
 * quote with CONFIDENTIAL_INTENTS on every side → generate-intent → sign → submit-intent → status.
 * Returns the final status object in LIVE mode, or undefined after a dry quote.
 */
export async function confidentialSwap(o: {
  from: Signer;
  session: Session;
  assetIn: string;
  assetOut: string;
  amount: string;
  recipient: string;
}) {
  const q = await quote({
    originAsset: o.assetIn,
    destinationAsset: o.assetOut,
    amount: o.amount,
    depositType: "CONFIDENTIAL_INTENTS",
    recipient: o.recipient,
    recipientType: "CONFIDENTIAL_INTENTS",
    refundTo: o.from.signerId,
    refundType: "CONFIDENTIAL_INTENTS",
  });
  if (!LIVE) return undefined;

  step("Generate intent → sign → submit");
  const gen = await api("/v0/generate-intent", {
    body: { type: "swap_transfer", standard: o.from.standard, signerId: o.from.signerId, depositAddress: q.quote.depositAddress },
  });
  const payload: string = gen.intent.payload;
  const signedData = await o.from.sign(payload);
  const sub = await api("/v0/submit-intent", { body: { type: "swap_transfer", signedData } });
  console.log(`  intentHash: ${sub.intentHash}`);
  return waitForStatus(q.quote.depositAddress);
}
