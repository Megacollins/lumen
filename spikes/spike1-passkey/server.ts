// Spike 1 — Passkey (WebAuthn P-256) → Intents User-Session.
// Run `npm run spike1`, open http://localhost:5180, create a passkey, then sign in.
// No money moves. The page signs an empty intent; this server forwards it to /v0/auth/authenticate.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { base58, base64urlnopad } from "@scure/base";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { p256 } from "@noble/curves/nist.js";
import { emptyIntentPayload, authenticateSigned, balances } from "../lib/intents.js";

const PORT = 5180;
const page = readFileSync(new URL("./index.html", import.meta.url));

/** Intents account id for a P-256 key: 0x + last 20 bytes of keccak256("p256" ‖ x ‖ y). */
function p256SignerId(pub64: Uint8Array) {
  return "0x" + bytesToHex(keccak_256(concatBytes(utf8ToBytes("p256"), pub64)).slice(12));
}

async function readJson(req: any) {
  let s = "";
  for await (const c of req) s += c;
  return JSON.parse(s);
}

const routes: Record<string, (body: any) => Promise<unknown>> = {
  // Page sends its public key (64 bytes x‖y, base64url); we build the empty intent it must sign.
  async "/api/challenge"({ publicKey }) {
    const pub = base64urlnopad.decode(publicKey);
    if (pub.length !== 64) throw new Error(`public key must be 64 bytes, got ${pub.length}`);
    const signerId = p256SignerId(pub);
    const payload = await emptyIntentPayload(signerId);
    const challenge = base64urlnopad.encode(sha256(utf8ToBytes(payload)));
    return { signerId, payload, challenge };
  },

  // Page returns the WebAuthn assertion; we convert DER → compact low-S and authenticate.
  async "/api/authenticate"({ payload, publicKey, signatureDer, clientDataJSON, authenticatorData }) {
    const pub = base64urlnopad.decode(publicKey);
    const der = base64urlnopad.decode(signatureDer);
    const authData = base64urlnopad.decode(authenticatorData);
    let sig = p256.Signature.fromBytes(der, "der");
    if (sig.hasHighS()) sig = new p256.Signature(sig.r, p256.Point.CURVE().n - sig.s); // low-S form
    const compact = sig.toBytes("compact");

    // Local check first, so a failure tells us whether the bug is ours or the server's.
    const msg = concatBytes(authData, sha256(utf8ToBytes(clientDataJSON)));
    const localOk = p256.verify(compact, msg, concatBytes(new Uint8Array([4]), pub), { lowS: false });

    const signedData = {
      standard: "webauthn",
      payload,
      public_key: "p256:" + base58.encode(pub),
      signature: "p256:" + base58.encode(compact),
      client_data_json: clientDataJSON,
      authenticator_data: authenticatorData,
    };
    const session = await authenticateSigned(signedData);
    const bal = await balances(session.accessToken);
    // Tokens stay on the server; the page only learns that it worked.
    return { localSignatureValid: localOk, sessionExpiresIn: session.expiresIn, balances: bal };
  },
};

createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  const handler = req.method === "POST" && routes[req.url ?? ""];
  if (!handler) {
    res.writeHead(404);
    return res.end();
  }
  try {
    const out = await handler(await readJson(req));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
  } catch (e: any) {
    console.error(`${req.url}:`, e.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => console.log(`Spike 1 → http://localhost:${PORT}`));
