import { IntentsSDK, VersionedNonceBuilder } from "@defuse-protocol/intents-sdk";
import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base58, base64urlnopad } from "@scure/base";

// WebAuthn (P-256) signing for NEAR Intents, verified against the intents contract's own test vectors (spikes/).

let sdk: IntentsSDK | undefined;
const intents = () => (sdk ??= new IntentsSDK({ referral: "lumen", env: "production" }));

/** Intents account id for a P-256 key: 0x + last 20 bytes of keccak256("p256" ‖ x ‖ y). */
export function p256SignerId(pub64: Uint8Array): string {
  if (pub64.length !== 64) throw new Error("public key must be 64 bytes (x ‖ y)");
  return "0x" + bytesToHex(keccak_256(concatBytes(utf8ToBytes("p256"), pub64)).slice(12));
}

/** An empty intent: proves key ownership without moving funds. Returns the exact string to sign and its challenge. */
export async function ownershipPayload(signerId: string) {
  const p = await intents()
    .intentBuilder()
    .setSigner(signerId)
    .setDeadline(new Date(Date.now() + 5 * 60_000))
    .setNonceRandomBytes(VersionedNonceBuilder.createTimestampedNonceBytes(new Date()))
    .build();
  // Field order matches the SDK's own signers.
  const payload = JSON.stringify({
    signer_id: p.signer_id,
    verifying_contract: p.verifying_contract,
    deadline: p.deadline,
    nonce: p.nonce,
    intents: p.intents,
  });
  return { payload, challenge: base64urlnopad.encode(sha256(utf8ToBytes(payload))) };
}

export type Assertion = {
  payload: string;
  publicKey: string; // base64url, 64 bytes
  signatureDer: string; // base64url
  clientDataJSON: string;
  authenticatorData: string; // base64url
};

/** The origin the browser used for this request, as Vercel forwards it (or the local dev host). */
export function requestOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * Checks what NEAR Intents doesn't: the assertion is a WebAuthn *get* made on this site (origin and rpId hash match the
 * request's host) with the user present and verified (fingerprint, face or PIN).
 */
export function webauthnContextOk(a: Assertion, expectedOrigin: string) {
  try {
    const cd = JSON.parse(a.clientDataJSON) as { type?: string; origin?: string };
    if (cd.type !== "webauthn.get" || cd.origin !== expectedOrigin) return false;
    const auth = base64urlnopad.decode(a.authenticatorData);
    if (auth.length < 37) return false;
    const rpIdHash = sha256(utf8ToBytes(new URL(expectedOrigin).hostname));
    if (!auth.slice(0, 32).every((b, i) => b === rpIdHash[i])) return false;
    const flags = auth[32];
    return (flags & 0x01) !== 0 && (flags & 0x04) !== 0; // UP and UV
  } catch {
    return false;
  }
}

/** Builds the Intents `webauthn` MultiPayload from a browser assertion (DER → compact low-S). */
export function webauthnSignedData(a: Assertion) {
  const pub = base64urlnopad.decode(a.publicKey);
  let sig = p256.Signature.fromBytes(base64urlnopad.decode(a.signatureDer), "der");
  if (sig.hasHighS()) sig = new p256.Signature(sig.r, p256.Point.CURVE().n - sig.s);
  const compact = sig.toBytes("compact");

  const msg = concatBytes(base64urlnopad.decode(a.authenticatorData), sha256(utf8ToBytes(a.clientDataJSON)));
  const valid = p256.verify(compact, msg, concatBytes(new Uint8Array([4]), pub), { lowS: false });

  return {
    valid,
    signedData: {
      standard: "webauthn",
      payload: a.payload,
      public_key: "p256:" + base58.encode(pub),
      signature: "p256:" + base58.encode(compact),
      client_data_json: a.clientDataJSON,
      authenticator_data: a.authenticatorData,
    },
  };
}
