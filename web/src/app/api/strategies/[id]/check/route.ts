import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { checkHoldings, valueRange } from "@/lib/server/strategies";
import { dbError } from "@/lib/server/strategy-views";

/**
 * The creator asks Lumen to compare their real NEAR Intents balance with the current allocation. Lumen reads it with
 * the creator's own session and stores only pass/fail, the largest difference and, if they chose to, a value range.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  if (!s || s.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  try {
    const sql = await db();
    const [st] = (await sql`select s.creator, s.show_value, a.weights from strategies s
      join allocations a on a.strategy_id = s.id where s.id = ${id} order by a.version desc limit 1`) as {
      creator: string;
      show_value: boolean;
      weights: Record<string, number>;
    }[];
    if (!st) return Response.json({ error: "Strategy not found." }, { status: 404 });
    if (st.creator !== s.signerId) return Response.json({ error: "Only the creator can check this strategy's holdings." }, { status: 403 });
    const c = await checkHoldings(s.accessToken, st.weights);
    await sql`insert into holdings_checks (strategy_id, matched, max_diff, reason, value_range)
      values (${id}, ${c.matched}, ${c.maxDiff}, ${c.reason}, ${st.show_value && c.total >= 1 ? valueRange(c.total) : null})`;
    return Response.json({ matched: c.matched, maxDiff: c.maxDiff, reason: c.reason });
  } catch (e) {
    return dbError(e);
  }
}
