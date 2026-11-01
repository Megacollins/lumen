import { buildOrder, confidential, executionAllowed, quoteErrorMessage } from "@/lib/server/orders";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

type QuoteResponse = {
  quote: {
    amountInFormatted: string;
    amountInUsd: string;
    amountOutFormatted: string;
    amountOutUsd: string;
    minAmountOut: string;
    timeEstimate: number;
  };
};

/**
 * Dry-run quote for a buy or sell between Intents balances. Never executes.
 * With a partner key the quote uses Confidential Intents; without one it is a public-route preview.
 */
export async function POST(req: Request) {
  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "Sign in to get a quote." }, { status: 401 });

  const { symbol, side, amount } = (await req.json().catch(() => ({}))) as { symbol?: string; side?: "buy" | "sell"; amount?: string };
  const order = buildOrder(
    { flow: "trade", symbol: symbol ?? "", side: side as "buy" | "sell", amount: amount ?? "" },
    session.signerId,
    req.headers.get("x-vercel-ip-country"),
  );
  if ("error" in order) return Response.json({ error: order.error }, { status: order.status });

  try {
    const q = await oneclick<QuoteResponse>("/v0/quote", {
      body: { dry: true, deadline: new Date(Date.now() + 10 * 60_000).toISOString(), ...order.body },
    });
    return Response.json({
      side,
      symbol,
      amountIn: q.quote.amountInFormatted,
      amountInUsd: Number(q.quote.amountInUsd),
      amountOut: q.quote.amountOutFormatted,
      amountOutUsd: Number(q.quote.amountOutUsd),
      minAmountOut: Number(q.quote.minAmountOut) / 10 ** order.outDecimals,
      timeEstimateSec: q.quote.timeEstimate,
      mode: confidential() ? "confidential" : "public-preview",
      executable: !session.demo && executionAllowed(order),
    });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    const { error, status } = quoteErrorMessage(msg);
    return Response.json({ error }, { status });
  }
}
