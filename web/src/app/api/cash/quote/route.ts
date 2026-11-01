import type { CashKind } from "@/lib/cash";
import { buildOrder, confidential, executionAllowed, quoteErrorMessage } from "@/lib/server/orders";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

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
  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const { kind, amount, chain, recipient } = (await req.json().catch(() => ({}))) as {
    kind?: CashKind;
    amount?: string;
    chain?: string;
    recipient?: string;
  };
  const order = buildOrder({ flow: "cash", kind: kind as CashKind, amount: amount ?? "", chain, recipient }, session.signerId, null);
  if ("error" in order) return Response.json({ error: order.error }, { status: order.status });

  try {
    const q = await oneclick<QuoteResponse>("/v0/quote", {
      body: { dry: true, deadline: new Date(Date.now() + 10 * 60_000).toISOString(), ...order.body },
    });
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
    const { error, status } = quoteErrorMessage(msg);
    return Response.json({ error }, { status });
  }
}
