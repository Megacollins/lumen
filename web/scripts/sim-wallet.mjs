// Dev check: wallet sign-in through Lumen's server with software wallets, against NEAR Intents mainnet.
//   nep413 — a fresh ed25519 key as a NEAR implicit account, signed the way NEAR wallets' signMessage does.
//   erc191 — a fresh EVM key, signed with personal_sign (what MetaMask does), via viem from ../spikes.
// With "order", it then sends $1 through the real execution pipeline (dev server with LUMEN_DEV_EXECUTION=1);
// the fresh account is empty, so NEAR Intents should accept the signed intent and then mark it FAILED.
// Usage: node scripts/sim-wallet.mjs [baseUrl] [nep413|erc191] [order]
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base58, base64 } from "@scure/base";

const base = process.argv[2] ?? "http://localhost:3220";
const standard = process.argv[3] ?? "nep413";
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
    if (kv.slice(i + 1)) jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  return { status: res.status, body: await res.json().catch(() => null) };
}

const withOrder = process.argv[4] === "order";
let signOrder; // (payload) => signature fields for /api/execute/submit

if (standard === "nep413") {
  const u32 = (n) => new Uint8Array(new Uint32Array([n]).buffer);
  const str = (s) => concatBytes(u32(utf8ToBytes(s).length), utf8ToBytes(s));
  const sk = ed25519.utils.randomSecretKey();
  const pk = ed25519.getPublicKey(sk);
  const accountId = bytesToHex(pk); // implicit account: no key registration needed

  const ch = await call("/api/auth/challenge", { standard, accountId });
  console.log("1. challenge:", ch.status, JSON.stringify(ch.body?.payload).slice(0, 160) + "…");
  const p = ch.body.payload;
  const hash = sha256(concatBytes(u32(2 ** 31 + 413), str(p.message), base64.decode(p.nonce), str(p.recipient), new Uint8Array([0])));
  const signature = base64.encode(ed25519.sign(hash, sk)); // wallets return base64
  const v = await call("/api/auth/wallet", { standard, payload: p, publicKey: "ed25519:" + base58.encode(pk), signature });
  console.log("2. sign-in:", v.status, JSON.stringify(v.body));
  signOrder = (q) => {
    const h = sha256(concatBytes(u32(2 ** 31 + 413), str(q.message), base64.decode(q.nonce), str(q.recipient), new Uint8Array([0])));
    return { publicKey: "ed25519:" + base58.encode(pk), signature: base64.encode(ed25519.sign(h, sk)) };
  };
} else {
  const { privateKeyToAccount, generatePrivateKey } = await import("../../spikes/node_modules/viem/_esm/accounts/index.js");
  const acct = privateKeyToAccount(generatePrivateKey());
  const ch = await call("/api/auth/challenge", { standard, address: acct.address });
  console.log("1. challenge:", ch.status, String(ch.body?.payload).slice(0, 120) + "…");
  const signature = await acct.signMessage({ message: ch.body.payload });
  const v = await call("/api/auth/wallet", { standard, payload: ch.body.payload, signature });
  console.log("2. sign-in:", v.status, JSON.stringify(v.body), "address:", acct.address);
  signOrder = async (q) => ({ signature: await acct.signMessage({ message: q }) });
}

const a = await call("/api/account");
console.log("3. account:", a.status, JSON.stringify(a.body));

if (withOrder) {
  const prep = await call("/api/execute/prepare", { flow: "cash", kind: "send", amount: "1", recipient: "0x055f2e87d74ffda9e7bc2646ba76a5938d75679b" });
  console.log("4. prepare:", prep.status, prep.body?.standard, JSON.stringify(prep.body?.payload ?? prep.body).slice(0, 200));
  if (prep.status === 200) {
    const sub = await call("/api/execute/submit", { standard, payload: prep.body.payload, ...(await signOrder(prep.body.payload)) });
    console.log("5. submit:", sub.status, JSON.stringify(sub.body));
    await new Promise((r) => setTimeout(r, 4000));
    const st = await call(`/api/execute/status?depositAddress=${encodeURIComponent(prep.body.depositAddress)}`);
    console.log("6. status:", st.status, JSON.stringify(st.body));
  }
}
process.exit(0);
