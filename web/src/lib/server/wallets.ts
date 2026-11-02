// Wallet signers (EVM via ERC-191, NEAR via NEP-413) shaped the way NEAR Intents expects them.
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base58, base64 } from "@scure/base";

export type WalletStandard = "erc191" | "nep413";
export type Nep413Payload = { message: string; nonce: string; recipient: string; callbackUrl?: string | null };
/** What a signer is asked to sign: a JSON string (webauthn, erc191) or a NEP-413 object (NEAR wallets). */
export type SignPayload = string | Nep413Payload;

/** An intent as a JSON string → the NEP-413 form NEAR wallets sign (same layout as the Intents SDK's signer). */
export function toNep413(intentJson: string): Nep413Payload {
  const p = JSON.parse(intentJson);
  return {
    message: JSON.stringify({ deadline: p.deadline, intents: p.intents, signer_id: p.signer_id }),
    nonce: p.nonce,
    recipient: p.verifying_contract,
  };
}

/** The account a payload would act for, or null if it can't be read. */
export function signerOf(payload: SignPayload): string | null {
  try {
    const inner = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.message);
    return typeof inner.signer_id === "string" ? inner.signer_id : null;
  } catch {
    return null;
  }
}

/** Stable text form of a payload, for hashing what the server handed out. */
export const payloadText = (p: SignPayload) => (typeof p === "string" ? p : JSON.stringify(p));

/** personal_sign output (65 bytes, v = 27/28) → Intents' `secp256k1:<base58>` with v = 0/1. */
export function erc191SignedData(payload: string, signatureHex: string) {
  const b = hexToBytes(signatureHex.replace(/^0x/, ""));
  if (b.length !== 65) throw new Error("Unexpected signature length");
  if (b[64] >= 27) b[64] -= 27;
  return { standard: "erc191", payload, signature: "secp256k1:" + base58.encode(b) };
}

const u32 = (n: number) => new Uint8Array(new Uint32Array([n]).buffer);
const borshString = (s: string) => concatBytes(u32(utf8ToBytes(s).length), utf8ToBytes(s));

/** NEP-413 hash: sha256(borsh(2^31 + 413) ‖ borsh({message, nonce[32], recipient, callback_url})). */
function nep413Hash(p: Nep413Payload) {
  const cb = p.callbackUrl ? concatBytes(new Uint8Array([1]), borshString(p.callbackUrl)) : new Uint8Array([0]);
  return sha256(concatBytes(u32(2 ** 31 + 413), borshString(p.message), base64.decode(p.nonce), borshString(p.recipient), cb));
}

/**
 * NEAR wallet signMessage output → Intents' nep413 MultiPayload. Checks the ed25519 signature locally;
 * NEAR Intents separately checks the key belongs to the account.
 */
export function nep413SignedData(payload: Nep413Payload, publicKey: string, signature: string) {
  const pub = base58.decode(publicKey.replace(/^ed25519:/, ""));
  const sig = signature.startsWith("ed25519:") ? base58.decode(signature.slice(8)) : base64.decode(signature);
  const valid = pub.length === 32 && sig.length === 64 && ed25519.verify(sig, nep413Hash(payload), pub);
  return {
    valid,
    signedData: { standard: "nep413", payload, public_key: "ed25519:" + base58.encode(pub), signature: "ed25519:" + base58.encode(sig) },
  };
}
