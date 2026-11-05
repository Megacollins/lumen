import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { dbError, unseenUpdates } from "@/lib/server/strategy-views";

/** Strategies this account follows, with how many allocation updates each has that the follower hasn't opened. */
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  if (!s || s.demo) return Response.json({ following: [] });
  try {
    return Response.json({ following: await unseenUpdates(s.signerId) });
  } catch (e) {
    return dbError(e);
  }
}
