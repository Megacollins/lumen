import { db } from "./db";
import { getUnderlying, UNDERLYING } from "./market-intel";
import { performance, type Allocation } from "./strategies";

// Smart Alerts: rules the account sets, checked when the account opens Intelligence and once a day by cron.
// An alert is only raised from data Lumen actually fetched, and each event names its source.

export type Rule = { kind: "asset" | "strategy"; target: string; threshold: number };

const pct = (r: number) => `${(Math.abs(r) * 100).toFixed(1)}%`;
const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const usd = (n: number) => `$${n.toFixed(2)}`;

/** Checks one account's rules (or every account's, from cron) and records new events. Returns how many were added. */
export async function evaluateAlerts(signerId?: string) {
  const sql = await db();
  const rules = (signerId ? await sql`select * from alert_rules where signer_id = ${signerId}` : await sql`select * from alert_rules`) as {
    signer_id: string;
    kind: string;
    target: string;
    threshold: number;
    last_version: number | null;
    last_ret: number | null;
  }[];
  let added = 0;
  const add = async (signer: string, dedupe: string, title: string, detail: string, sourceName: string, sourceUrl: string) => {
    const r = await sql`insert into alert_events (signer_id, dedupe, title, detail, source_name, source_url)
      values (${signer}, ${dedupe}, ${title}, ${detail}, ${sourceName}, ${sourceUrl}) on conflict do nothing returning id`;
    added += r.length;
  };

  const quotes = new Map<string, Awaited<ReturnType<typeof getUnderlying>>>();
  for (const rule of rules) {
    if (rule.kind === "asset") {
      if (!quotes.has(rule.target)) quotes.set(rule.target, await getUnderlying(rule.target));
      const q = quotes.get(rule.target);
      if (!q || q.change1d == null || Math.abs(q.change1d) < rule.threshold / 100) continue;
      const last = q.closes.at(-1)!;
      const prev = q.closes.at(-2)!;
      await add(
        rule.signer_id,
        `asset:${q.symbol}:${last.date}:${rule.threshold}`,
        `${UNDERLYING[q.symbol]?.name ?? q.symbol} ${q.change1d >= 0 ? "rose" : "fell"} ${pct(q.change1d)} on ${day(last.date)}`,
        `${q.symbol} closed at ${usd(last.close)}, from ${usd(prev.close)} the session before. Your alert is set at ${rule.threshold}%.`,
        q.source.name,
        q.source.url,
      );
    } else {
      const allocs =
        (await sql`select version, at, weights, note from allocations where strategy_id = ${rule.target} order by version`) as {
          version: number;
          at: Date;
          weights: Record<string, number>;
          note: string;
        }[];
      if (!allocs.length) continue;
      const [st] = (await sql`select name from strategies where id = ${rule.target}`) as { name: string }[];
      const latest = allocs.at(-1)!;
      const url = `/app/invest/strategies/${rule.target}`;
      if (rule.last_version != null && latest.version > rule.last_version)
        await add(
          rule.signer_id,
          `strategy:${rule.target}:v${latest.version}`,
          `${st?.name ?? "A strategy you follow"} changed its allocation`,
          latest.note || "The creator published a new allocation.",
          "Lumen Strategies",
          url,
        );
      const perf = await performance(allocs.map((a) => ({ ...a, at: new Date(a.at).toISOString() })) as Allocation[]);
      if (rule.last_ret != null && perf.ret != null && Math.abs(perf.ret - rule.last_ret) >= rule.threshold / 100)
        await add(
          rule.signer_id,
          `strategy:${rule.target}:ret:${perf.points.at(-1)?.at}`,
          `${st?.name ?? "A strategy you follow"} moved ${pct(perf.ret - rule.last_ret)} since your last alert`,
          `Its return since publishing went from ${(rule.last_ret * 100).toFixed(2)}% to ${(perf.ret * 100).toFixed(2)}%, from prices Lumen records from NEAR Intents.`,
          "Lumen Strategies",
          url,
        );
      const moved = rule.last_ret == null || (perf.ret != null && Math.abs(perf.ret - rule.last_ret) >= rule.threshold / 100);
      await sql`update alert_rules set last_version = ${latest.version}, last_ret = ${moved ? perf.ret : rule.last_ret}
        where signer_id = ${rule.signer_id} and kind = 'strategy' and target = ${rule.target}`;
    }
  }
  return added;
}
