import { recordPrices } from "@/lib/server/strategies";
import { dbError } from "@/lib/server/strategy-views";

// Daily snapshot (vercel.json) so performance keeps a data point even on days nobody opens Strategies.
// Opening Strategies also records one when the last is over 30 minutes old.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  try {
    const snap = await recordPrices();
    return Response.json({ at: snap?.at ?? null, symbols: snap ? Object.keys(snap.prices).length : 0 });
  } catch (e) {
    return dbError(e);
  }
}
