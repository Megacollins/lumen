// Dev check: the Strategies journey through Lumen's server, against the real database and NEAR Intents mainnet.
// Two fresh NEAR implicit accounts (software keys, signed like NEAR wallets' signMessage): a creator and a follower.
// Usage: node scripts/sim-strategies.mjs [baseUrl]
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
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
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
const list0 = await anon("/api/strategies");
expect("anonymous list loads", list0.status === 200, `${list0.body.strategies?.length} strategies, canPublish=${list0.body.canPublish}`);
expect("anonymous cannot publish", (await anon("/api/strategies", { name: "x" })).status === 401);

const demo = client();
await demo("/api/demo", {});
expect("demo cannot publish", (await demo("/api/strategies", { name: "Demo try" })).status === 403);

const creator = await signIn();
const follower = await signIn();
const handle = "sim_" + creator.accountId.slice(0, 8);
const spec = {
  handle,
  bio: "Test creator from sim-strategies.mjs",
  name: "Test: gold and big tech",
  focus: "Long-term growth with a gold hedge",
  approach: "Hold big tech for growth and a gold ETF as a hedge; rebalance when a weight drifts.",
  weights: { NVDA: 30, AAPL: 20, GLD: 40, USDC: 10 },
  checkHoldings: true,
};
expect("weights must add to 100", (await creator.call("/api/strategies", { ...spec, weights: { NVDA: 50 } })).status === 400);
expect("unknown asset rejected", (await creator.call("/api/strategies", { ...spec, weights: { DOGE: 100 } })).status === 400);
expect("bad handle rejected", (await creator.call("/api/strategies", { ...spec, handle: "No Spaces!" })).status === 400);
const created = await creator.call("/api/strategies", spec);
expect("creator publishes", created.status === 200 && !!created.body.id, JSON.stringify(created.body));
const id = created.body.id;

let d = await creator.call(`/api/strategies/${id}`);
expect("owner sees isOwner", d.body.strategy?.isOwner === true);
expect("holdings check ran and did not match (empty account)", d.body.strategy?.check?.matched === false, d.body.strategy?.check?.reason);
expect("account id hidden by default", d.body.strategy?.creator.accountId === null);
expect("owner cannot follow own", (await creator.call(`/api/strategies/${id}/follow`, {})).status === 400);

expect(
  "follower cannot change allocation",
  (await follower.call(`/api/strategies/${id}/allocation`, { weights: { GLD: 100 } })).status === 403,
);
expect("follower cannot run holdings check", (await follower.call(`/api/strategies/${id}/check`, {})).status === 403);
expect("demo cannot follow", (await demo(`/api/strategies/${id}/follow`, {})).status === 403);
expect("follower follows", (await follower.call(`/api/strategies/${id}/follow`, {})).status === 200);
let f = await follower.call("/api/strategies/following");
expect("follow listed, nothing unseen", f.body.following?.find((x) => x.id === id)?.unseen === 0);

const upd = await creator.call(`/api/strategies/${id}/allocation`, {
  weights: { NVDA: 25, AAPL: 15, GLD: 50, USDC: 10 },
  note: "More gold.",
});
expect("creator updates allocation", upd.status === 200 && upd.body.version === 2);
f = await follower.call("/api/strategies/following");
expect("follower sees 1 unseen update", f.body.following?.find((x) => x.id === id)?.unseen === 1);
d = await follower.call(`/api/strategies/${id}`);
expect("detail shows the update with note", d.body.strategy?.updates?.[0]?.note === "More gold.");
expect("detail marks it new once", d.body.strategy?.newUpdates === 1 && d.body.strategy?.following === true);
f = await follower.call("/api/strategies/following");
expect("opening clears unseen", f.body.following?.find((x) => x.id === id)?.unseen === 0);
expect("followers counted", d.body.strategy?.followers === 1);
expect(
  "performance has points",
  (d.body.strategy?.snapshots ?? 0) >= 1,
  `snapshots=${d.body.strategy?.snapshots} ret=${d.body.strategy?.ret}`,
);

const csv = await anon(`/api/strategies/${id}/prices`);
expect(
  "prices CSV downloads",
  csv.status === 200 && typeof csv.body === "string" && csv.body.includes("recorded_at,symbol"),
  `${String(csv.body).split("\n").length} lines`,
);

expect("follower unfollows", (await follower.call(`/api/strategies/${id}/follow`, undefined, "DELETE")).status === 200);
d = await follower.call(`/api/strategies/${id}`);
expect("unfollowed", d.body.strategy?.following === false && d.body.strategy?.followers === 0);
expect("unknown strategy 404", (await anon("/api/strategies/doesnotexist")).status === 404);

console.log(`\nstrategy ${id}  creator @${handle}  ${fails ? fails + " FAILED" : "all passed"}`);
process.exit(fails ? 1 : 0);
