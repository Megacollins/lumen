import type { CashKind } from "@/lib/cash";
import { buildOrder, checkRecipient, confidential, executionAllowed, quoteErrorMessage } from "@/lib/server/orders";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";
import { cached, rateLimit } from "@/lib/server/ratelimit";
import { jsonObject, str } from "@/lib/server/validate";

type QuoteResponse = {
  quote: {
    amountInFormatted: string;
    amountOutFormatted: string;
    minAmountOut: string;
    timeEstimate: number;
  };
};

/**
 * Dry-run quote for adding, sending or withdrawing USDC. Never moves money.
 * With a partner key the private side uses Confidential Intents; without one it is a public-route preview.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "quote");
  if (limited) return limited;
  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const body = (await jsonObject(req)) ?? {};
  const kind = str(body.kind);
  const amount = str(body.amount);
  const chain = str(body.chain);
  const recipient = str(body.recipient);
  const order = buildOrder({ flow: "cash", kind: kind as CashKind, amount: amount ?? "", chain, recipient }, session.signerId, null);
  if ("error" in order) return Response.json({ error: order.error }, { status: order.status });
  const bad = await checkRecipient(order);
  if (bad) return Response.json({ error: bad.error }, { status: bad.status });

  try {
    // Identical quotes within 5 seconds share one NEAR Intents call (typing, refreshes, repeated requests).
    const q = await cached(`quote:${JSON.stringify(order.body)}`, 5_000, () =>
      oneclick<QuoteResponse>("/v0/quote", {
        body: { dry: true, deadline: new Date(Date.now() + 10 * 60_000).toISOString(), ...order.body },
      }),
    );
    return Response.json({
      kind,
      amountIn: q.quote.amountInFormatted,
      amountOut: q.quote.amountOutFormatted,
      minAmountOut: Number(q.quote.minAmountOut) / 10 ** order.outDecimals,
      timeEstimateSec: q.quote.timeEstimate,
      mode: confidential() ? "confidential" : "public-preview",
      executable: !session.demo && executionAllowed(order),
    });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    if (kind === "withdraw" && /failed to get quote/i.test(msg))
      return Response.json({ error: "No quote for this amount. It may be below the minimum for moving out to that network; try a larger amount." }, { status: 422 });
    const { error, status } = quoteErrorMessage(msg);
    return Response.json({ error }, { status });
  }
}
