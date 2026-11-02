import { base64urlnopad } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { buildOrder, checkRecipient, devExecution, executionAllowed, quoteErrorMessage, type OrderSpec } from "@/lib/server/orders";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { rememberOrder, sha256Hex, writePending } from "@/lib/server/pending";
import { CHAINS } from "@/lib/cash";
import { getSession } from "@/lib/server/session";
import { payloadText, signerOf, type SignPayload } from "@/lib/server/wallets";
import { rateLimit } from "@/lib/server/ratelimit";

type LiveQuote = {
  quote: {
    depositAddress: string;
    depositMemo?: string;
    amountInFormatted: string;
    amountOutFormatted: string;
    minAmountOut: string;
    deadline?: string;
    timeEstimate: number;
  };
};

/**
 * Step 1 of a real order: a live (non-dry) quote, then the intent for the passkey to sign.
 * "Add money" has nothing to sign: it returns the one-time deposit address on the origin chain.
 * Refused unless the flow passed its live mainnet test (see executionAllowed).
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "execute");
  if (limited) return limited;
  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (session.demo) return Response.json({ error: "The demo can't place real orders." }, { status: 403 });

  const spec = (await req.json().catch(() => null)) as OrderSpec | null;
  if (!spec) return Response.json({ error: "Missing order." }, { status: 400 });
  const order = buildOrder(spec, session.signerId, req.headers.get("x-vercel-ip-country"));
  if ("error" in order) return Response.json({ error: order.error }, { status: order.status });
  if (!executionAllowed(order)) return Response.json({ error: "This isn't open yet. It opens after a live test on mainnet." }, { status: 403 });
  const badRecipient = await checkRecipient(order);
  if (badRecipient) return Response.json({ error: badRecipient.error }, { status: badRecipient.status });

  // 1Click intents stay valid for days, so never ask the passkey to sign what the balance can't cover now:
  // an unfunded signed intent could otherwise settle later, once money arrives. (Skipped only for dev pipeline tests.)
  if (order.signed && !devExecution()) {
    const asset = String(order.body.originAsset);
    const need = BigInt(String(order.body.amount));
    let have: bigint;
    try {
      const { balances } = await oneclick<{ balances: { tokenId: string; available: string }[] }>("/v0/account/balances", {
        userToken: session.accessToken,
      });
      have = BigInt(balances.find((b) => b.tokenId === asset)?.available ?? "0");
    } catch {
      return Response.json({ error: "Couldn't check your balance with NEAR Intents. Try again." }, { status: 502 });
    }
    if (have < need) return Response.json({ error: "That's more than your available balance." }, { status: 422 });
  }

  let q: LiveQuote;
  try {
    q = await oneclick<LiveQuote>("/v0/quote", {
      body: { dry: false, deadline: new Date(Date.now() + 10 * 60_000).toISOString(), ...order.body },
    });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    const { error, status } = quoteErrorMessage(msg);
    return Response.json({ error }, { status });
  }
  const { depositAddress } = q.quote;
  const summary = {
    amountIn: q.quote.amountInFormatted,
    amountOut: q.quote.amountOutFormatted,
    minAmountOut: Number(q.quote.minAmountOut) / 10 ** order.outDecimals,
    timeEstimateSec: q.quote.timeEstimate,
  };

  if (!order.signed) {
    const chain = spec.flow === "cash" ? (CHAINS.find((c) => c.id === spec.chain)?.name ?? "") : "";
    await rememberOrder({
      signerId: session.signerId,
      kind: "deposit",
      depositAddress,
      summary: order.summary,
      at: Date.now(),
      deposit: { amount: q.quote.amountInFormatted, chain, memo: q.quote.depositMemo ?? null, deadline: q.quote.deadline ?? null },
    });
    return Response.json({ step: "deposit", depositAddress, depositMemo: q.quote.depositMemo ?? null, deadline: q.quote.deadline ?? null, ...summary });
  }

  // The intent comes back in the signer's own format: a JSON string (passkey, EVM) or a NEP-413 object (NEAR).
  let payload: SignPayload;
  try {
    const gen = await oneclick<{ intent: { standard: string; payload: SignPayload } }>("/v0/generate-intent", {
      body: { type: "swap_transfer", standard: session.standard, signerId: session.signerId, depositAddress },
    });
    payload = gen.intent.payload;
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    return Response.json({ error: msg ? `NEAR Intents couldn't prepare the order: ${msg}` : "NEAR Intents couldn't prepare the order." }, { status: 502 });
  }

  // Never ask the passkey or wallet to sign for someone else.
  if (signerOf(payload) !== session.signerId) return Response.json({ error: "NEAR Intents returned an intent for a different account." }, { status: 502 });

  await writePending({ signerId: session.signerId, payloadHash: sha256Hex(payloadText(payload)), depositAddress, summary: order.summary });
  const challenge = typeof payload === "string" && session.standard === "webauthn" ? base64urlnopad.encode(sha256(utf8ToBytes(payload))) : null;
  return Response.json({ step: "sign", standard: session.standard, payload, challenge, depositAddress, ...summary });
}
