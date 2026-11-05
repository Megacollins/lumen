import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { parseWeights, recordPrices } from "@/lib/server/strategies";
import { dbError } from "@/lib/server/strategy-views";
import { jsonObject, str } from "@/lib/server/validate";

/** The creator changes the allocation. It takes effect at a fresh price snapshot and reaches followers as an update. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  if (!s || s.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  const b = await jsonObject(req);
  const weights = parseWeights(b?.weights);
  if (typeof weights === "string") return Response.json({ error: weights }, { status: 400 });
  const note = (str(b?.note) ?? "").trim();
  if (note.length > 280) return Response.json({ error: "Keep the note under 280 characters." }, { status: 400 });

  try {
    const sql = await db();
    const [st] = (await sql`select creator from strategies where id = ${id}`) as { creator: string }[];
    if (!st) return Response.json({ error: "Strategy not found." }, { status: 404 });
    if (st.creator !== s.signerId) return Response.json({ error: "Only the creator can change this strategy." }, { status: 403 });
    const snap = await recordPrices(0);
    if (!snap || Date.now() - new Date(snap.at).getTime() > 60 * 60_000)
      return Response.json({ error: "Prices can't be loaded from NEAR Intents right now. Try again shortly." }, { status: 503 });
    const missing = Object.keys(weights).filter((k) => !snap.prices[k]);
    if (missing.length) return Response.json({ error: `No current price for ${missing.join(", ")}.` }, { status: 422 });
    const [{ v }] = (await sql`select coalesce(max(version), 0)::int as v from allocations where strategy_id = ${id}`) as { v: number }[];
    await sql`insert into allocations (strategy_id, version, at, weights, note) values (${id}, ${v + 1}, ${snap.at}, ${JSON.stringify(weights)}::jsonb, ${note})`;
    return Response.json({ version: v + 1 });
  } catch (e) {
    return dbError(e);
  }
}
