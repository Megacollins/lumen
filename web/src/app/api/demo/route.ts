import { demoSession, writeSession } from "@/lib/server/session";

// Starts a demo session: no passkey, simulated balances in the browser, real dry-run quotes.
export async function POST() {
  await writeSession(demoSession());
  return Response.json({ ok: true });
}
