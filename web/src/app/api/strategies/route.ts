import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { checkHoldings, newId, parseWeights, recordPrices, valueRange } from "@/lib/server/strategies";
import { dbError, listStrategies } from "@/lib/server/strategy-views";
import { jsonObject, str } from "@/lib/server/validate";

/** Every published strategy, newest first, plus the viewer's creator profile if they have one. */
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  try {
    await recordPrices();
    const sql = await db();
    const [me] = s && !s.demo ? ((await sql`select handle from creators where signer_id = ${s.signerId}`) as { handle: string }[]) : [];
    return Response.json({ strategies: await listStrategies(), me: me ?? null, canPublish: !!s && !s.demo });
  } catch (e) {
    return dbError(e);
  }
}

const HANDLE = /^[a-z0-9_]{3,20}$/;
const text = (v: unknown, min: number, max: number) => {
  const t = str(v)?.trim() ?? "";
  return t.length >= min && t.length <= max ? t : null;
};

/**
 * Publishes a strategy. Allocation percentages are always public; showing the account id, a holdings check and the
 * value range are each the creator's choice. The first allocation starts at a fresh price snapshot.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  if (!s) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (s.demo) return Response.json({ error: "Publishing needs a real account. Sign in with a passkey or wallet." }, { status: 403 });

  const b = await jsonObject(req);
  const name = text(b?.name, 3, 60);
  const focus = text(b?.focus, 3, 80);
  const approach = text(b?.approach, 20, 1000);
  if (!name || !focus || !approach)
    return Response.json({ error: "Add a name (3–60 characters), a focus (3–80) and an approach (20–1,000)." }, { status: 400 });
  const weights = parseWeights(b?.weights);
  if (typeof weights === "string") return Response.json({ error: weights }, { status: 400 });
  const showValue = b?.showValue === true;
  const runCheck = b?.checkHoldings === true || showValue;

  try {
    const sql = await db();
    const [creator] = (await sql`select handle from creators where signer_id = ${s.signerId}`) as { handle: string }[];
    if (!creator) {
      const handle = str(b?.handle)?.trim().toLowerCase();
      if (!handle || !HANDLE.test(handle))
        return Response.json({ error: "Choose a creator name: 3–20 lowercase letters, numbers or underscores." }, { status: 400 });
      const bio = text(b?.bio, 0, 160);
      if (bio === null) return Response.json({ error: "Keep the bio under 160 characters." }, { status: 400 });
      const taken = await sql`select 1 from creators where handle = ${handle}`;
      if (taken.length) return Response.json({ error: "That creator name is taken." }, { status: 409 });
      await sql`insert into creators (signer_id, handle, bio, show_account) values (${s.signerId}, ${handle}, ${bio}, ${b?.showAccount === true})`;
    }

    const snap = await recordPrices(0);
    if (!snap || Date.now() - new Date(snap.at).getTime() > 60 * 60_000)
      return Response.json(
        { error: "Prices can't be loaded from NEAR Intents right now, so the track record can't start. Try again shortly." },
        { status: 503 },
      );
    const missing = Object.keys(weights).filter((k) => !snap.prices[k]);
    if (missing.length)
      return Response.json({ error: `No current price for ${missing.join(", ")}, so it can't be included yet.` }, { status: 422 });

    const id = newId();
    await sql`insert into strategies (id, creator, name, focus, approach, show_value) values (${id}, ${s.signerId}, ${name}, ${focus}, ${approach}, ${showValue})`;
    await sql`insert into allocations (strategy_id, version, at, weights) values (${id}, 1, ${snap.at}, ${JSON.stringify(weights)}::jsonb)`;

    if (runCheck) {
      const c = await checkHoldings(s.accessToken, weights).catch(() => null);
      if (c)
        await sql`insert into holdings_checks (strategy_id, matched, max_diff, reason, value_range)
          values (${id}, ${c.matched}, ${c.maxDiff}, ${c.reason}, ${showValue && c.total >= 1 ? valueRange(c.total) : null})`;
    }
    return Response.json({ id });
  } catch (e) {
    return dbError(e);
  }
}
