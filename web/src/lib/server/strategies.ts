import { randomBytes } from "node:crypto";
import { fromBaseUnits } from "@/lib/markets";
import { STRATEGY_ASSETS } from "@/lib/strategy-assets";
import { db } from "./db";
import { oneclick } from "./oneclick";

// Strategies are model allocations across Lumen's assets. Their performance is computed only from prices Lumen
// recorded from the NEAR Intents token list, starting the moment a strategy is published: no backfilled history,
// no simulated fills, no fees. Holdings checks read the creator's real NEAR Intents balance with their own session.

const ONECLICK = "https://1click.chaindefuser.com";
const SYMBOLS = new Set(STRATEGY_ASSETS.map((a) => a.symbol));

/** A check passes when every weight is within this many percentage points of the published allocation. */
export const CHECK_TOLERANCE_PP = 5;
const SNAPSHOT_MAX_AGE_MS = 30 * 60_000;

export type Weights = Record<string, number>;
export type Allocation = { version: number; at: string; weights: Weights; note: string };
export type Point = { at: string; ret: number };

export const newId = () => randomBytes(8).toString("base64url");

/** Whole-number percentages over Lumen's assets, summing to exactly 100. Returns the cleaned weights or an error. */
export function parseWeights(v: unknown): Weights | string {
  if (!v || typeof v !== "object" || Array.isArray(v)) return "Choose an allocation.";
  const out: Weights = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!SYMBOLS.has(k)) return `${k} isn't an asset Lumen supports.`;
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 100)
      return "Each weight is a whole percentage from 0 to 100.";
    if (raw > 0) out[k] = raw;
  }
  const sum = Object.values(out).reduce((s, n) => s + n, 0);
  if (sum !== 100) return `Weights add up to ${sum}%; they need to add up to 100%.`;
  return out;
}

type Snapshot = { at: string; prices: Record<string, number> };

/**
 * The newest price snapshot, taking a fresh one from the NEAR Intents token list when the last is older than
 * `maxAgeMs`. Only prices the list actually returns are stored; nothing is filled in.
 */
export async function recordPrices(maxAgeMs = SNAPSHOT_MAX_AGE_MS): Promise<Snapshot | null> {
  const sql = await db();
  const [last] = (await sql`select max(at) as at from prices`) as { at: Date | null }[];
  if (!last?.at || Date.now() - new Date(last.at).getTime() > maxAgeMs) {
    try {
      const res = await fetch(`${ONECLICK}/v0/tokens?ondoTokens=true`, { cache: "no-store" });
      if (res.ok) {
        const tokens: { assetId: string; price?: number; priceUpdatedAt?: string }[] = await res.json();
        const byId = new Map(tokens.map((t) => [t.assetId, t]));
        const at = new Date().toISOString();
        const rows = STRATEGY_ASSETS.flatMap((a) => {
          const t = byId.get(a.assetId);
          return t && typeof t.price === "number" && t.price > 0
            ? [{ symbol: a.symbol, price: t.price, source: t.priceUpdatedAt ?? null }]
            : [];
        });
        for (const r of rows)
          await sql`insert into prices (at, symbol, price, source_at) values (${at}, ${r.symbol}, ${r.price}, ${r.source}) on conflict do nothing`;
      }
    } catch {
      // Unreachable token list: keep using the last snapshot rather than inventing prices.
    }
  }
  const rows = (await sql`select at, symbol, price from prices where at = (select max(at) from prices)`) as {
    at: Date;
    symbol: string;
    price: number;
  }[];
  if (!rows.length) return null;
  return { at: new Date(rows[0].at).toISOString(), prices: Object.fromEntries(rows.map((r) => [r.symbol, r.price])) };
}

/**
 * Time-weighted return of the published allocations, chained across allocation changes, at every recorded snapshot
 * since the strategy started. Prices carry forward between snapshots when the list omitted one.
 */
export async function performance(allocs: Allocation[]): Promise<{ points: Point[]; ret: number | null; snapshots: number }> {
  if (!allocs.length) return { points: [], ret: null, snapshots: 0 };
  const sql = await db();
  const symbols = [...new Set(allocs.flatMap((a) => Object.keys(a.weights)))];
  const rows = (await sql`select at, symbol, price from prices where symbol = any(${symbols}) and at >= ${allocs[0].at} order by at`) as {
    at: Date;
    symbol: string;
    price: number;
  }[];
  const points = chainReturns(allocs, rows);
  const step = Math.ceil(points.length / 240);
  const thinned = step > 1 ? points.filter((_, i) => i % step === 0 || i === points.length - 1) : points;
  return { points: thinned, ret: points.at(-1)?.ret ?? null, snapshots: points.length };
}

/** The pure calculation behind performance(): rows in time order, allocations by version. */
export function chainReturns(allocs: Allocation[], rows: { at: Date | string; symbol: string; price: number }[]): Point[] {
  const byTime = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const t = new Date(r.at).toISOString();
    byTime.set(t, { ...(byTime.get(t) ?? {}), [r.symbol]: r.price });
  }
  const last: Record<string, number> = {};
  let seg = 0;
  let base: Record<string, number> | null = null;
  let weights: Weights = {};
  let segStart = 1;
  let value = 1;
  const points: Point[] = [];
  for (const [t, snap] of byTime) {
    Object.assign(last, snap);
    if (base) value = segStart * Object.entries(weights).reduce((s, [k, w]) => s + (w / 100) * (base![k] ? last[k] / base![k] : 1), 0);
    while (seg < allocs.length && new Date(allocs[seg].at).getTime() <= new Date(t).getTime()) {
      segStart = value;
      base = { ...last };
      weights = allocs[seg].weights;
      seg++;
    }
    if (base) points.push({ at: t, ret: value - 1 });
  }
  return points;
}

export function valueRange(usd: number) {
  if (usd < 1_000) return "Under $1,000";
  if (usd < 10_000) return "$1,000 – $10,000";
  if (usd < 100_000) return "$10,000 – $100,000";
  return "Over $100,000";
}

/**
 * Reads the creator's confidential balance from NEAR Intents (their own session token), values it at the latest
 * snapshot and compares it with the published weights. Only the outcome is stored; balances are not.
 */
export async function checkHoldings(userToken: string, weights: Weights) {
  const snap = await recordPrices(5 * 60_000);
  if (!snap) return { matched: false, maxDiff: null, reason: "No prices recorded yet, so holdings couldn't be valued.", total: 0 };
  const { balances } = await oneclick<{ balances: { tokenId: string; available: string }[] }>("/v0/account/balances", { userToken });
  const values: Record<string, number> = {};
  for (const a of STRATEGY_ASSETS) {
    const b = balances.find((x) => x.tokenId === a.assetId);
    const price = snap.prices[a.symbol];
    if (b && price) values[a.symbol] = Number(fromBaseUnits(b.available, a.decimals)) * price;
  }
  const total = Object.values(values).reduce((s, n) => s + n, 0);
  if (total < 1) return { matched: false, maxDiff: null, reason: "No balance in Lumen's assets was found in NEAR Intents.", total };
  const keys = new Set([...Object.keys(weights), ...Object.keys(values)]);
  let maxDiff = 0;
  for (const k of keys) maxDiff = Math.max(maxDiff, Math.abs(((values[k] ?? 0) / total) * 100 - (weights[k] ?? 0)));
  const matched = maxDiff <= CHECK_TOLERANCE_PP;
  return {
    matched,
    maxDiff,
    reason: matched ? "" : `Holdings differ from the allocation by up to ${maxDiff.toFixed(1)} percentage points.`,
    total,
  };
}
