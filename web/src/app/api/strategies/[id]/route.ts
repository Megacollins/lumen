import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { recordPrices } from "@/lib/server/strategies";
import { dbError, loadStrategy } from "@/lib/server/strategy-views";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const { id } = await params;
  const s = await getSession().catch(() => null);
  try {
    await recordPrices();
    const strategy = await loadStrategy(id, s && !s.demo ? s.signerId : null);
    if (!strategy) return Response.json({ error: "Strategy not found." }, { status: 404 });
    return Response.json({ strategy, canFollow: !!s && !s.demo });
  } catch (e) {
    return dbError(e);
  }
}
