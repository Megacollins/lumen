import { EXECUTION_VERIFIED, findAsset, MIN_ORDER_USD, toBaseUnits, USDC } from "@/lib/markets";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

// Tokenized stocks are not offered to US persons. On Vercel the request country arrives in this header.
const BLOCKED_COUNTRIES = new Set(["US"]);

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
  const country = req.headers.get("x-vercel-ip-country");
  if (country && BLOCKED_COUNTRIES.has(country))
    return Response.json({ error: "Tokenized stocks aren't available in your country." }, { status: 451 });

  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "Sign in to get a quote." }, { status: 401 });

  const { symbol, side, amount } = (await req.json().catch(() => ({}))) as {
    symbol?: string;
    side?: "buy" | "sell";
    amount?: string;
  };
  const asset = symbol ? findAsset(symbol) : undefined;
  if (!asset || (side !== "buy" && side !== "sell") || !amount)
    return Response.json({ error: "Choose an asset, a side and an amount." }, { status: 400 });

  const from = side === "buy" ? USDC : asset;
  const to = side === "buy" ? asset : USDC;
  const base = toBaseUnits(amount, from.decimals);
  if (base == null || base <= BigInt(0)) return Response.json({ error: "Enter a valid amount." }, { status: 400 });
  if (side === "buy" && Number(amount) < MIN_ORDER_USD)
    return Response.json({ error: `The minimum order is $${MIN_ORDER_USD}.` }, { status: 422 });

  const confidential = !!process.env.ONECLICK_JWT;
  const balanceType = confidential ? "CONFIDENTIAL_INTENTS" : "INTENTS";

  try {
    const q = await oneclick<QuoteResponse>("/v0/quote", {
      body: {
        dry: true,
        swapType: "EXACT_INPUT",
        slippageTolerance: 100,
        originAsset: from.assetId,
        destinationAsset: to.assetId,
        amount: base.toString(),
        depositType: balanceType,
        recipient: session.signerId,
        recipientType: balanceType,
        refundTo: session.signerId,
        refundType: balanceType,
        confidentiality: confidential ? "basic" : "public",
        deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    });
    const minOut = Number(q.quote.minAmountOut) / 10 ** to.decimals;
    return Response.json({
      side,
      symbol: asset.symbol,
      amountIn: q.quote.amountInFormatted,
      amountInUsd: Number(q.quote.amountInUsd),
      amountOut: q.quote.amountOutFormatted,
      amountOutUsd: Number(q.quote.amountOutUsd),
      minAmountOut: minOut,
      timeEstimateSec: q.quote.timeEstimate,
      mode: confidential ? "confidential" : "public-preview",
      executable: confidential && EXECUTION_VERIFIED.has(asset.symbol),
    });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    if (/liquidity/i.test(msg))
      return Response.json({ error: "No quote for this amount right now. Try a larger amount or later." }, { status: 422 });
    return Response.json({ error: "Couldn't get a quote from NEAR Intents. Try again." }, { status: 502 });
  }
}
