// Dev check: runs the full passkey sign-in against a running Lumen server with a software P-256 authenticator,
// then reads the account. Usage: node scripts/sim-passkey.mjs [baseUrl]
import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base64urlnopad as b64 } from "@scure/base";

const base = process.argv[2] ?? "http://localhost:3220";
const host = new URL(base).hostname;
let cookie = "";

async function call(path, body) {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}

const sk = p256.utils.randomSecretKey();
const publicKey = b64.encode(p256.getPublicKey(sk, false).slice(1));

console.log("account before sign-in:", (await call("/api/account")).status);
const ch = await call("/api/auth/challenge", { publicKey });
console.log("challenge:", ch.status, ch.body?.signerId);

const clientDataJSON = JSON.stringify({ type: "webauthn.get", challenge: ch.body.challenge, origin: base });
const authData = concatBytes(sha256(utf8ToBytes(host)), new Uint8Array([0x05, 0, 0, 0, 1])); // UP + UV flags
const der = p256.sign(concatBytes(authData, sha256(utf8ToBytes(clientDataJSON))), sk, { format: "der", lowS: false });

const v = await call("/api/auth/verify", {
  payload: ch.body.payload,
  publicKey,
  signatureDer: b64.encode(der),
  clientDataJSON,
  authenticatorData: b64.encode(authData),
});
console.log("verify:", v.status, JSON.stringify(v.body), "cookie set:", !!cookie);
console.log("account:", JSON.stringify(await call("/api/account")));
console.log("logout:", (await call("/api/auth/logout", {})).status);
