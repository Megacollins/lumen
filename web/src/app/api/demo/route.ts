import { rateLimit } from "@/lib/server/ratelimit";
import { demoSession, getSession, writeSession } from "@/lib/server/session";
import { jsonObject } from "@/lib/server/validate";

// Starts a demo session: no passkey, simulated balances in the browser, real dry-run quotes.
// If a real account is signed in, it asks first (409) instead of silently signing it out; send {confirm: true} to switch.
export async function POST(req: Request) {
  const limited = rateLimit(req, "demo");
  if (limited) return limited;
  const current = await getSession().catch(() => null);
  const body = await jsonObject(req);
  if (current && !current.demo && body?.confirm !== true) return Response.json({ signedIn: true }, { status: 409 });
  await writeSession(demoSession());
  return Response.json({ ok: true });
}
