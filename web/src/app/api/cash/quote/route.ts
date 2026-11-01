import { CASH_VERIFIED, CHAINS, isChainAddress, isIntentsAccount, type CashKind } from "@/lib/cash";
import { toBaseUnits, USDC } from "@/lib/markets";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

type QuoteResponse = {
  quote: {
    amountInFormatted: string;
    amountOutFormatted: string;
    minAmountOut: string;
    timeEstimate: number;
    withdrawFee?: string;
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
  const base = amount ? toBaseUnits(amount, USDC.decimals) : null;
  if (!base || base <= BigInt(0)) return Response.json({ error: "Enter an amount." }, { status: 400 });

  const confidential = !!process.env.ONECLICK_JWT;
  const privateType = confidential ? "CONFIDENTIAL_INTENTS" : "INTENTS";
  const me = session.signerId;

  let body: Record<string, unknown>;
  if (kind === "add") {
    const c = CHAINS.find((x) => x.id === chain);
    if (!c) return Response.json({ error: "Choose where the money comes from." }, { status: 400 });
    body = { originAsset: c.assetId, depositType: "ORIGIN_CHAIN", destinationAsset: USDC.assetId, recipient: me, recipientType: privateType, refundTo: me, refundType: privateType };
  } else if (kind === "send") {
    const to = recipient?.trim().toLowerCase() ?? "";
    if (!isIntentsAccount(to)) return Response.json({ error: "Enter a Lumen or NEAR Intents account id." }, { status: 400 });
    if (to === me) return Response.json({ error: "That's your own account." }, { status: 400 });
    body = { originAsset: USDC.assetId, depositType: privateType, destinationAsset: USDC.assetId, recipient: to, recipientType: privateType, refundTo: me, refundType: privateType };
  } else if (kind === "withdraw") {
    const c = CHAINS.find((x) => x.id === chain);
    const to = recipient?.trim() ?? "";
    if (!c) return Response.json({ error: "Choose a network." }, { status: 400 });
    if (!isChainAddress(c.address, to)) return Response.json({ error: `Enter a valid ${c.name} address.` }, { status: 400 });
    body = { originAsset: USDC.assetId, depositType: privateType, destinationAsset: c.assetId, recipient: to, recipientType: "DESTINATION_CHAIN", refundTo: me, refundType: privateType };
  } else {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  try {
    const q = await oneclick<QuoteResponse>("/v0/quote", {
      body: {
        dry: true,
        swapType: "EXACT_INPUT",
        slippageTolerance: 100,
        amount: base.toString(),
        confidentiality: confidential ? "basic" : "public",
        deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
        ...body,
      },
    });
    return Response.json({
      kind,
      amountIn: q.quote.amountInFormatted,
      amountOut: q.quote.amountOutFormatted,
      minAmountOut: Number(q.quote.minAmountOut) / 10 ** USDC.decimals,
      timeEstimateSec: q.quote.timeEstimate,
      mode: confidential ? "confidential" : "public-preview",
      executable: confidential && CASH_VERIFIED.has(kind),
    });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    if (/liquidity/i.test(msg)) return Response.json({ error: "No route for this amount right now. Try another amount." }, { status: 422 });
    if (/recipient/i.test(msg)) return Response.json({ error: "NEAR Intents didn't accept that recipient." }, { status: 422 });
    return Response.json({ error: "Couldn't get a quote from NEAR Intents. Try again." }, { status: 502 });
  }
}
