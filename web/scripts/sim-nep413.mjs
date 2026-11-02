// Dev check: proves NEAR-wallet (NEP-413) sign-in with NEAR Intents, using a fresh ed25519 key as a NEAR implicit
// account (the account id is the hex public key, so nothing needs registering). Talks to 1Click directly.
// Usage: node scripts/sim-nep413.mjs
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base58, base64 } from "@scure/base";
import { IntentsSDK, VersionedNonceBuilder } from "@defuse-protocol/intents-sdk";

const u32 = (n) => new Uint8Array(new Uint32Array([n]).buffer);
const str = (s) => concatBytes(u32(utf8ToBytes(s).length), utf8ToBytes(s));
/** NEP-413: sha256(borsh(2^31+413) ‖ borsh({message, nonce[32], recipient, callback_url: None})) */
const nep413Hash = ({ message, nonce, recipient }) =>
  sha256(concatBytes(u32(2 ** 31 + 413), str(message), nonce, str(recipient), new Uint8Array([0])));

const sk = ed25519.utils.randomSecretKey();
const pk = ed25519.getPublicKey(sk);
const accountId = bytesToHex(pk); // NEAR implicit account

const sdk = new IntentsSDK({ referral: "lumen", env: "production" });
const intent = await sdk
  .intentBuilder()
  .setSigner(accountId)
  .setDeadline(new Date(Date.now() + 5 * 60_000))
  .setNonceRandomBytes(VersionedNonceBuilder.createTimestampedNonceBytes(new Date()))
  .build();

const payload = {
  message: JSON.stringify({ deadline: intent.deadline, intents: intent.intents, signer_id: accountId }),
  nonce: intent.nonce,
  recipient: intent.verifying_contract,
};
const sig = ed25519.sign(nep413Hash({ ...payload, nonce: base64.decode(payload.nonce) }), sk);
const signedData = { standard: "nep413", payload, public_key: "ed25519:" + base58.encode(pk), signature: "ed25519:" + base58.encode(sig) };

const res = await fetch("https://1click.chaindefuser.com/v0/auth/authenticate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ signedData }),
});
const body = await res.json().catch(() => null);
console.log("account:", accountId);
console.log("authenticate:", res.status, body?.accessToken ? `session issued (expires in ${body.expiresIn}s)` : JSON.stringify(body));
process.exit(0);
