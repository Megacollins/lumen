import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession, type Session } from "@/lib/server/session";
import { dbError } from "@/lib/server/strategy-views";

// Following only subscribes to updates. It never places, prepares or authorises a trade.
async function account(req: Request): Promise<{ s: Session; error?: never } | { s?: never; error: Response }> {
  const limited = rateLimit(req, "write");
  if (limited) return { error: limited };
  const s = await getSession().catch(() => null);
  if (!s) return { error: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (s.demo)
    return { error: Response.json({ error: "Following needs a real account. Sign in with a passkey or wallet." }, { status: 403 }) };
  return { s };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { s, error } = await account(req);
  if (error) return error;
  const { id } = await params;
  try {
    const sql = await db();
    const [st] = (await sql`select creator from strategies where id = ${id}`) as { creator: string }[];
    if (!st) return Response.json({ error: "Strategy not found." }, { status: 404 });
    if (st.creator === s.signerId) return Response.json({ error: "You can't follow your own strategy." }, { status: 400 });
    await sql`insert into follows (strategy_id, signer_id, seen_version)
      values (${id}, ${s.signerId}, coalesce((select max(version) from allocations where strategy_id = ${id}), 1)) on conflict do nothing`;
    return Response.json({ following: true });
  } catch (e) {
    return dbError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { s, error } = await account(req);
  if (error) return error;
  const { id } = await params;
  try {
    const sql = await db();
    await sql`delete from follows where strategy_id = ${id} and signer_id = ${s.signerId}`;
    return Response.json({ following: false });
  } catch (e) {
    return dbError(e);
  }
}
