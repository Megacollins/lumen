// Dev check: signs in with a software P-256 passkey, then runs a real order through the execution pipeline
// (live quote → generate-intent → passkey signature → submit-intent → status) against NEAR Intents mainnet.
// A fresh account holds nothing, so NEAR Intents should reject the submit for lack of funds: that proves every
// step up to moving money. Needs a dev server started with LUMEN_DEV_EXECUTION=1.
// Usage: node scripts/sim-order.mjs [baseUrl] [send|buy]
import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base64urlnopad as b64 } from "@scure/base";

const base = process.argv[2] ?? "http://localhost:3220";
const kind = process.argv[3] ?? "send";
const host = new URL(base).hostname;
const jar = new Map();

async function call(path, body) {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const c of res.headers.getSetCookie()) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    const v = kv.slice(i + 1);
    if (v) jar.set(kv.slice(0, i), v);
    else jar.delete(kv.slice(0, i));
  }
  return { status: res.status, body: await res.json().catch(() => null) };
}

const sk = p256.utils.randomSecretKey();
const publicKey = b64.encode(p256.getPublicKey(sk, false).slice(1));

/** What the browser's navigator.credentials.get() would return for this challenge. */
function assertion(payload, challenge) {
  const clientDataJSON = JSON.stringify({ type: "webauthn.get", challenge, origin: base });
  const authData = concatBytes(sha256(utf8ToBytes(host)), new Uint8Array([0x05, 0, 0, 0, 1])); // UP + UV flags
  const der = p256.sign(concatBytes(authData, sha256(utf8ToBytes(clientDataJSON))), sk, { format: "der", lowS: false });
  return { payload, publicKey, signatureDer: b64.encode(der), clientDataJSON, authenticatorData: b64.encode(authData) };
}

const ch = await call("/api/auth/challenge", { publicKey });
const v = await call("/api/auth/verify", assertion(ch.body.payload, ch.body.challenge));
console.log("1. sign-in:", v.status, v.body?.signerId);

const spec =
  kind === "buy"
    ? { flow: "trade", symbol: "NVDA", side: "buy", amount: "30" }
    : { flow: "cash", kind: "send", amount: "1", recipient: "0x055f2e87d74ffda9e7bc2646ba76a5938d75679b" };
const prep = await call("/api/execute/prepare", spec);
console.log("2. prepare:", prep.status, JSON.stringify({ ...prep.body, payload: prep.body?.payload?.slice(0, 120) + "…" }));
if (prep.status !== 200) process.exit(1);
console.log("   intent to sign:", prep.body.payload);

const sub = await call("/api/execute/submit", assertion(prep.body.payload, prep.body.challenge));
console.log("3. submit:", sub.status, JSON.stringify(sub.body));

const replay = await call("/api/execute/submit", assertion(prep.body.payload, prep.body.challenge));
console.log("4. replay of the same signature:", replay.status, JSON.stringify(replay.body));

const st = await call(`/api/execute/status?depositAddress=${encodeURIComponent(prep.body.depositAddress)}`);
console.log("5. status:", st.status, JSON.stringify(st.body));
