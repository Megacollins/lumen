import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/ratelimit";
import { dbError } from "@/lib/server/strategy-views";

/** Every recorded price behind this strategy's performance, as CSV, so anyone can recompute it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const { id } = await params;
  try {
    const sql = await db();
    const allocs = (await sql`select version, at, weights from allocations where strategy_id = ${id} order by version`) as {
      version: number;
      at: Date;
      weights: Record<string, number>;
    }[];
    if (!allocs.length) return Response.json({ error: "Strategy not found." }, { status: 404 });
    const symbols = [...new Set(allocs.flatMap((a) => Object.keys(a.weights)))];
    const rows = (await sql`select at, symbol, price, source_at from prices
      where symbol = any(${symbols}) and at >= ${allocs[0].at} order by at, symbol`) as {
      at: Date;
      symbol: string;
      price: number;
      source_at: Date | null;
    }[];
    const lines = [
      "# Allocations: version, effective at, weights in percent",
      ...allocs.map((a) => `# v${a.version} ${new Date(a.at).toISOString()} ${JSON.stringify(a.weights)}`),
      "recorded_at,symbol,price_usd,token_list_price_updated_at",
      ...rows.map(
        (r) => `${new Date(r.at).toISOString()},${r.symbol},${r.price},${r.source_at ? new Date(r.source_at).toISOString() : ""}`,
      ),
    ];
    return new Response(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lumen-strategy-${id}-prices.csv"`,
      },
    });
  } catch (e) {
    return dbError(e);
  }
}
