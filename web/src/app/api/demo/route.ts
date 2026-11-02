import { demoSession, writeSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

// Starts a demo session: no passkey, simulated balances in the browser, real dry-run quotes.
export async function POST(req: Request) {
  const limited = rateLimit(req, "demo");
  if (limited) return limited;
  await writeSession(demoSession());
  return Response.json({ ok: true });
}
