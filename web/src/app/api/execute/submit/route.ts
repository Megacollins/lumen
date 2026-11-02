import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { requestOrigin, webauthnContextOk, webauthnSignedData } from "@/lib/server/passkey";
import { rememberOrder, sha256Hex, takePending } from "@/lib/server/pending";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { assertion, jsonObject, nep413Payload, str } from "@/lib/server/validate";
import { erc191SignedData, nep413SignedData, payloadText, type SignPayload } from "@/lib/server/wallets";

/** NEAR Intents' rejection reasons, in words a user can act on; anything else gets a generic line (and the log). */
function rejection(msg: string) {
  if (/balance|insufficient|not enough/i.test(msg)) return "Not enough balance for this order.";
  if (/deadline|expired|nonce/i.test(msg)) return "This order expired. Start again for a fresh quote.";
  if (/signature/i.test(msg)) return "The signature wasn't accepted. Start again for a fresh quote.";
  return "NEAR Intents rejected the order. Try again for a fresh quote.";
}

/**
 * Step 2 of a real order: the signed intent goes to NEAR Intents.
 * Only an exact payload handed out by /api/execute/prepare, within its 5-minute window, is accepted, once, and only
 * from the signer type this account uses (passkey, EVM wallet or NEAR wallet).
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "execute");
  if (limited) return limited;
  const session = await getSession().catch(() => null);
  if (!session || session.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const b = await jsonObject(req);
  const standard = str(b?.standard) ?? "webauthn";
  if (standard !== session.standard) return Response.json({ error: "This account signs a different way." }, { status: 400 });

  // Read and type-check the signature before touching the pending order.
  let payload: SignPayload;
  let signedData: Record<string, unknown>;
  try {
    if (standard === "erc191") {
      const p = str(b?.payload);
      const sig = str(b?.signature);
      if (!p || !sig) return Response.json({ error: "Incomplete signature." }, { status: 400 });
      payload = p;
      signedData = erc191SignedData(p, sig);
    } else if (standard === "nep413") {
      const p = nep413Payload(b?.payload);
      const pk = str(b?.publicKey);
      const sig = str(b?.signature);
      if (!p || !pk || !sig) return Response.json({ error: "Incomplete signature." }, { status: 400 });
      const r = nep413SignedData(p, pk, sig);
      if (!r.valid) return Response.json({ error: "The wallet signature didn't verify." }, { status: 401 });
      payload = p;
      signedData = r.signedData;
    } else {
      const a = assertion(b);
      if (!a) return Response.json({ error: "Incomplete passkey response." }, { status: 400 });
      const r = webauthnSignedData(a);
      if (!r.valid) return Response.json({ error: "The passkey signature didn't verify." }, { status: 401 });
      if (!webauthnContextOk(a, requestOrigin(req))) return Response.json({ error: "Passkey response wasn't made on this site." }, { status: 401 });
      payload = a.payload;
      signedData = r.signedData;
    }
  } catch {
    return Response.json({ error: "Unreadable signature." }, { status: 400 });
  }

  const pending = await takePending(session.signerId, sha256Hex(payloadText(payload)));
  if (!pending) return Response.json({ error: "This order expired or was already used. Start again for a fresh quote." }, { status: 409 });

  try {
    const r = await oneclick<{ intentHash: string }>("/v0/submit-intent", { body: { type: "swap_transfer", signedData } });
    await rememberOrder({ signerId: session.signerId, kind: "signed", depositAddress: pending.depositAddress, summary: pending.summary, at: Date.now() });
    return Response.json({ intentHash: r.intentHash, depositAddress: pending.depositAddress });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    console.error("submit-intent rejected", msg || e);
    const status = e instanceof OneClickError && e.status < 500 ? 422 : 502;
    return Response.json({ error: rejection(msg) }, { status });
  }
}
