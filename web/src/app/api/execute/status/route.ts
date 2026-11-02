import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { knownOrder } from "@/lib/server/pending";
import { getSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

type StatusResponse = { status: string; updatedAt: string };

/** Status of an order this browser placed, straight from NEAR Intents (/v0/status). */
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const session = await getSession().catch(() => null);
  if (!session || session.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const depositAddress = new URL(req.url).searchParams.get("depositAddress") ?? "";
  const order = depositAddress ? await knownOrder(depositAddress, session.signerId) : null;
  if (!order) return Response.json({ error: "Unknown order." }, { status: 404 });

  try {
    const s = await oneclick<StatusResponse>(`/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`);
    return Response.json({ status: s.status, updatedAt: s.updatedAt, summary: order.summary });
  } catch (e) {
    if (e instanceof OneClickError && e.status === 404) return Response.json({ status: "PENDING_DEPOSIT", updatedAt: null, summary: order.summary });
    return Response.json({ error: "Couldn't reach NEAR Intents for the status." }, { status: 502 });
  }
}
