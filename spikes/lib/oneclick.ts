import "dotenv/config";

export const BASE = "https://1click.chaindefuser.com";

export const ASSETS = {
  USDC: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  NVDAon: "nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near",
  TSLAon: "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near",
  AAPLon: "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near",
  QQQon: "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near",
  GLDon: "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near",
} as const;

export const LIVE = process.env.LIVE === "1";

export function usd(n: string | number): string {
  return String(Math.round(Number(n) * 1e6)); // USDC base units
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env (see .env.example)`);
  return v;
}

export class OneClickError extends Error {
  constructor(public status: number, public body: unknown, path: string) {
    super(`${path} → ${status}: ${JSON.stringify(body)}`);
  }
}

/** Calls 1Click. Partner JWT goes in X-API-Key; a user session goes in Authorization. */
export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; userToken?: string; partner?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.partner !== false && process.env.ONECLICK_JWT) headers["X-API-Key"] = process.env.ONECLICK_JWT;
  if (opts.userToken) headers["Authorization"] = `Bearer ${opts.userToken}`;
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new OneClickError(res.status, json, path);
  return json as T;
}

export type QuoteParams = {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  depositType: "ORIGIN_CHAIN" | "INTENTS" | "CONFIDENTIAL_INTENTS";
  recipient: string;
  recipientType: "DESTINATION_CHAIN" | "INTENTS" | "CONFIDENTIAL_INTENTS";
  refundTo: string;
  refundType: "ORIGIN_CHAIN" | "INTENTS" | "CONFIDENTIAL_INTENTS";
  confidentiality?: "public" | "basic" | "advanced";
  dry?: boolean;
  slippageTolerance?: number;
};

/** /v0/quote only accepts the partner JWT; confidential quotes are refused without it. */
export async function quote(p: QuoteParams) {
  const body = {
    dry: p.dry ?? !LIVE,
    swapType: "EXACT_INPUT",
    slippageTolerance: p.slippageTolerance ?? 100, // 1%
    confidentiality: p.confidentiality ?? "basic",
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    ...p,
  };
  if (body.confidentiality !== "public" && !process.env.ONECLICK_JWT)
    throw new Error("Confidential quotes need the partner key. Set ONECLICK_JWT in .env.");
  const q = await api("/v0/quote", { body });
  const o = q.quote;
  console.log(
    `  quote: ${o.amountInFormatted} → ${o.amountOutFormatted} (min ${o.minAmountOut}), ` +
      `$${Number(o.amountInUsd).toFixed(2)} → $${Number(o.amountOutUsd).toFixed(2)}, ~${o.timeEstimate}s` +
      (o.depositAddress ? `\n  depositAddress: ${o.depositAddress}` : "  (dry: no deposit address)"),
  );
  return q;
}

const DONE = new Set(["SUCCESS", "REFUNDED", "FAILED"]);

export async function waitForStatus(depositAddress: string, timeoutMs = 45 * 60_000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const s = await api(`/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`);
    if (s.status !== last) {
      console.log(`  status: ${s.status}  (${Math.round((Date.now() - start) / 1000)}s)`);
      last = s.status;
    }
    if (DONE.has(s.status)) return s;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timed out waiting on ${depositAddress} (last status ${last})`);
}

export function step(title: string) {
  console.log(`\n▸ ${title}`);
}

export function pass(msg: string): never {
  console.log(`\n✅ PASS — ${msg}`);
  process.exit(0); // the Intents SDK keeps sockets open; exit explicitly
}

export function fail(e: unknown): never {
  console.error(`\n❌ FAIL — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
