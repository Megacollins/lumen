import { evaluateAlerts } from "@/lib/server/alerts";
import { db } from "@/lib/server/db";
import { UNDERLYING } from "@/lib/server/market-intel";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession, type Session } from "@/lib/server/session";
import { performance, type Allocation } from "@/lib/server/strategies";
import { dbError } from "@/lib/server/strategy-views";
import { jsonObject, str } from "@/lib/server/validate";

// Smart Alerts are per account and stored server-side, so they need a real (non-demo) sign-in.
const MAX_RULES = 40;
async function account(req: Request, group: "read" | "write"): Promise<{ s: Session; error?: never } | { s?: never; error: Response }> {
  const limited = rateLimit(req, group);
  if (limited) return { error: limited };
  const s = await getSession().catch(() => null);
  if (!s) return { error: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (s.demo) return { error: Response.json({ error: "Alerts need a real account. Sign in with a passkey or wallet." }, { status: 403 }) };
  return { s };
}

async function state(signerId: string) {
  const sql = await db();
  const rules = await sql`select kind, target, threshold from alert_rules where signer_id = ${signerId} order by created_at`;
  const events = await sql`select id, at, title, detail, source_name, source_url, seen from alert_events
    where signer_id = ${signerId} order by at desc limit 30`;
  return { rules, events };
}

export async function GET(req: Request) {
  const { s, error } = await account(req, "read");
  if (error) return error;
  try {
    // ?count=1 is the header bell: just the unread number, without re-checking markets on every page.
    if (new URL(req.url).searchParams.get("count") === "1") {
      const sql = await db();
      const [{ n }] = (await sql`select count(*)::int as n from alert_events where signer_id = ${s.signerId} and not seen`) as {
        n: number;
      }[];
      return Response.json({ unseen: n });
    }
    await evaluateAlerts(s.signerId);
    return Response.json(await state(s.signerId));
  } catch (e) {
    return dbError(e);
  }
}

/** Adds or updates a rule: {kind: "asset", target: "NVDA", threshold: 3} or {kind: "strategy", target: id, threshold: 2}. */
export async function POST(req: Request) {
  const { s, error } = await account(req, "write");
  if (error) return error;
  const b = await jsonObject(req);
  const kind = str(b?.kind);
  const target = str(b?.target) ?? "";
  const threshold = typeof b?.threshold === "number" ? b.threshold : NaN;
  if (kind !== "asset" && kind !== "strategy") return Response.json({ error: "Unknown alert type." }, { status: 400 });
  if (!(threshold >= 0.5 && threshold <= 50)) return Response.json({ error: "Choose a threshold between 0.5% and 50%." }, { status: 400 });
  if (kind === "asset" && !UNDERLYING[target]) return Response.json({ error: "Lumen doesn't offer that asset." }, { status: 400 });
  try {
    const sql = await db();
    let lastVersion: number | null = null;
    let lastRet: number | null = null;
    if (kind === "strategy") {
      const allocs = (await sql`select version, at, weights, note from allocations where strategy_id = ${target} order by version`) as {
        version: number;
        at: Date;
        weights: Record<string, number>;
        note: string;
      }[];
      if (!allocs.length) return Response.json({ error: "Strategy not found." }, { status: 404 });
      lastVersion = allocs.at(-1)!.version;
      lastRet = (await performance(allocs.map((a) => ({ ...a, at: new Date(a.at).toISOString() })) as Allocation[])).ret;
    }
    const [{ n: rules }] = (await sql`select count(*)::int as n from alert_rules
      where signer_id = ${s.signerId} and not (kind = ${kind} and target = ${target})`) as { n: number }[];
    if (rules >= MAX_RULES) return Response.json({ error: `You can have up to ${MAX_RULES} alerts. Turn one off first.` }, { status: 409 });
    // A new rule starts from the current state, so it only reports what changes after it was set.
    await sql`insert into alert_rules (signer_id, kind, target, threshold, last_version, last_ret)
      values (${s.signerId}, ${kind}, ${target}, ${threshold}, ${lastVersion}, ${lastRet})
      on conflict (signer_id, kind, target) do update set threshold = excluded.threshold`;
    return Response.json(await state(s.signerId));
  } catch (e) {
    return dbError(e);
  }
}

/** Removes a rule ({kind, target}), or marks every event seen ({seen: true}). */
export async function DELETE(req: Request) {
  const { s, error } = await account(req, "write");
  if (error) return error;
  const b = await jsonObject(req);
  try {
    const sql = await db();
    if (b?.seen === true) await sql`update alert_events set seen = true where signer_id = ${s.signerId}`;
    else
      await sql`delete from alert_rules where signer_id = ${s.signerId} and kind = ${str(b?.kind) ?? ""} and target = ${str(b?.target) ?? ""}`;
    return Response.json(await state(s.signerId));
  } catch (e) {
    return dbError(e);
  }
}
