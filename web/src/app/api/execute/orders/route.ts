import { ordersOf } from "@/lib/server/pending";
import { getSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

/** The orders this account placed from this browser, newest first. Status comes from /api/execute/status. */
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const session = await getSession().catch(() => null);
  if (!session || session.demo) return Response.json({ orders: [] });
  const orders = (await ordersOf(session.signerId)).map((o) => ({
    depositAddress: o.depositAddress,
    summary: o.summary,
    at: o.at,
    kind: o.kind,
    deposit: o.deposit ?? null,
  }));
  return Response.json({ orders });
}
