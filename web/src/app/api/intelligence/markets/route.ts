import { getMarketRows } from "@/lib/markets";
import { getFilings, getHeadlines, getUnderlying, UNDERLYING } from "@/lib/server/market-intel";
import { rateLimit } from "@/lib/server/ratelimit";

/**
 * Market Insights for every Lumen asset: the underlying's recent moves, Lumen's token price from NEAR Intents,
 * recent headlines and SEC filings. Public data only; nothing about the viewer is read or sent anywhere.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const [tokens, ...assets] = await Promise.all([
    getMarketRows(),
    ...Object.entries(UNDERLYING).map(async ([symbol, u]) => {
      const [underlying, headlines, filings] = await Promise.all([getUnderlying(symbol), getHeadlines(u.news), getFilings(u.cik)]);
      return { symbol, name: u.name, underlying, headlines, filings };
    }),
  ]);
  return Response.json({
    fetchedAt: new Date().toISOString(),
    tokens: { updatedAt: tokens.updatedAt, live: tokens.live, prices: Object.fromEntries(tokens.rows.map((r) => [r.symbol, r.price])) },
    assets,
  });
}
