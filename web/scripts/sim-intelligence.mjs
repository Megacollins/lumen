// Dev check: Lumen Intelligence (market insights + Smart Alerts) through Lumen's server, against live data sources,
// the real database and NEAR Intents mainnet, with fresh NEAR implicit accounts (software keys).
// Usage: node scripts/sim-intelligence.mjs [baseUrl]   — prints the test accounts' ids on the last line for cleanup.
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base58, base64 } from "@scure/base";

const base = process.argv[2] ?? "http://localhost:3220";
const u32 = (n) => new Uint8Array(new Uint32Array([n]).buffer);
const str = (s) => concatBytes(u32(utf8ToBytes(s).length), utf8ToBytes(s));

function client() {
  const jar = new Map();
  return async function call(path, body, method) {
    const res = await fetch(base + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      if (kv.slice(i + 1)) jar.set(kv.slice(0, i), kv.slice(i + 1));
      else jar.delete(kv.slice(0, i));
    }
    return { status: res.status, body: await res.json().catch(() => null) };
  };
}

async function signIn() {
  const call = client();
  const sk = ed25519.utils.randomSecretKey();
  const pk = ed25519.getPublicKey(sk);
  const accountId = bytesToHex(pk);
  const ch = await call("/api/auth/challenge", { standard: "nep413", accountId });
  const p = ch.body.payload;
  const hash = sha256(concatBytes(u32(2 ** 31 + 413), str(p.message), base64.decode(p.nonce), str(p.recipient), new Uint8Array([0])));
  const v = await call("/api/auth/wallet", {
    standard: "nep413",
    payload: p,
    publicKey: "ed25519:" + base58.encode(pk),
    signature: base64.encode(ed25519.sign(hash, sk)),
  });
  if (v.status !== 200) throw new Error("sign-in failed " + JSON.stringify(v.body));
  return { call, accountId };
}

let fails = 0;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) fails++;
};

const anon = client();
const m = await anon("/api/intelligence/markets");
const assets = m.body?.assets ?? [];
expect("market insights load for all five assets", m.status === 200 && assets.length === 5);
expect(
  "every asset has a sourced price history",
  assets.every((a) => a.underlying && a.underlying.closes.length > 5 && a.underlying.source?.url),
  assets.map((a) => `${a.symbol} ${a.underlying ? (a.underlying.change1d * 100).toFixed(2) + "%" : "none"}`).join(", "),
);
expect(
  "headlines carry publisher, link and time",
  assets.every((a) => a.headlines.every((h) => h.publisher && h.url.startsWith("https://") && !Number.isNaN(Date.parse(h.publishedAt)))),
  `${assets.reduce((s, a) => s + a.headlines.length, 0)} headlines`,
);
expect(
  "filings link to SEC EDGAR",
  assets.every((a) => a.filings.every((f) => f.url.startsWith("https://www.sec.gov/Archives/"))),
  `${assets.reduce((s, a) => s + a.filings.length, 0)} filings`,
);
expect("token prices from NEAR Intents", m.body?.tokens?.live === true);

expect("alerts need sign-in", (await anon("/api/intelligence/alerts")).status === 401);
const demo = client();
await demo("/api/demo", {});
expect("demo cannot use alerts", (await demo("/api/intelligence/alerts")).status === 403);

const creator = await signIn();
const follower = await signIn();
const a0 = await follower.call("/api/intelligence/alerts");
expect("empty alerts for a new account", a0.status === 200 && a0.body.rules.length === 0 && a0.body.events.length === 0);
expect(
  "threshold out of range rejected",
  (await follower.call("/api/intelligence/alerts", { kind: "asset", target: "GLD", threshold: 0.1 })).status === 400,
);
expect(
  "unknown asset rejected",
  (await follower.call("/api/intelligence/alerts", { kind: "asset", target: "DOGE", threshold: 2 })).status === 400,
);

// The asset that moved most in its last session, at the lowest allowed threshold, must raise a real alert.
const mover = [...assets]
  .filter((a) => a.underlying?.change1d != null)
  .sort((a, b) => Math.abs(b.underlying.change1d) - Math.abs(a.underlying.change1d))[0];
const set = await follower.call("/api/intelligence/alerts", { kind: "asset", target: mover.symbol, threshold: 0.5 });
expect("asset rule saved", set.status === 200 && set.body.rules.some((r) => r.target === mover.symbol));
let a1 = await follower.call("/api/intelligence/alerts");
const ev = a1.body.events.find((e) => e.title.includes(mover.name));
expect(
  `alert raised for ${mover.symbol} (${(mover.underlying.change1d * 100).toFixed(2)}%)`,
  !!ev && ev.source_name === "Yahoo Finance",
  ev?.title,
);
a1 = await follower.call("/api/intelligence/alerts");
expect("same move isn't alerted twice", a1.body.events.filter((e) => e.title.includes(mover.name)).length === 1);

const pub = await creator.call("/api/strategies", {
  handle: "sim_" + creator.accountId.slice(0, 8),
  name: "Test: alerts",
  focus: "Alert test",
  approach: "Temporary strategy used by sim-intelligence.mjs to test alerts.",
  weights: { GLD: 60, USDC: 40 },
});
const id = pub.body?.id;
expect("test strategy published", pub.status === 200 && !!id);
await follower.call(`/api/strategies/${id}/follow`, {});
const sr = await follower.call("/api/intelligence/alerts", { kind: "strategy", target: id, threshold: 1 });
expect("strategy rule saved", sr.status === 200 && sr.body.rules.some((r) => r.kind === "strategy" && r.target === id));
let a2 = await follower.call("/api/intelligence/alerts");
expect("no strategy alert before anything changes", !a2.body.events.some((e) => e.title.includes("Test: alerts")));
await creator.call(`/api/strategies/${id}/allocation`, { weights: { GLD: 80, USDC: 20 }, note: "Testing alerts." });
a2 = await follower.call("/api/intelligence/alerts");
const sev = a2.body.events.find((e) => e.title.includes("Test: alerts") && e.title.includes("changed its allocation"));
expect("strategy change raises an alert with the note", sev?.detail === "Testing alerts.", sev?.title);
const seen = await follower.call("/api/intelligence/alerts", { seen: true }, "DELETE");
expect("mark all read", seen.status === 200 && seen.body.events.every((e) => e.seen));
const del = await follower.call("/api/intelligence/alerts", { kind: "asset", target: mover.symbol }, "DELETE");
expect("rule removed", del.status === 200 && !del.body.rules.some((r) => r.target === mover.symbol));

console.log(`\n${fails ? fails + " FAILED" : "all passed"}`);
console.log(JSON.stringify({ accounts: [creator.accountId, follower.accountId] }));
process.exit(fails ? 1 : 0);
