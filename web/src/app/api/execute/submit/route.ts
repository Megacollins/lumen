import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { webauthnSignedData, type Assertion } from "@/lib/server/passkey";
import { rememberOrder, sha256Hex, takePending } from "@/lib/server/pending";
import { getSession } from "@/lib/server/session";

/**
 * Step 2 of a real order: the passkey-signed intent goes to NEAR Intents.
 * Only the exact payload handed out by /api/execute/prepare, within its 5-minute window, is accepted.
 */
export async function POST(req: Request) {
  const session = await getSession().catch(() => null);
  if (!session || session.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const a = (await req.json().catch(() => null)) as Assertion | null;
  if (!a?.payload || !a.publicKey || !a.signatureDer || !a.clientDataJSON || !a.authenticatorData)
    return Response.json({ error: "Incomplete passkey response." }, { status: 400 });

  const pending = await takePending(session.signerId);
  if (!pending || pending.payloadHash !== sha256Hex(a.payload))
    return Response.json({ error: "This order expired or was already used. Start again for a fresh quote." }, { status: 409 });

  const { valid, signedData } = webauthnSignedData(a);
  if (!valid) return Response.json({ error: "The passkey signature didn't verify." }, { status: 401 });

  try {
    const r = await oneclick<{ intentHash: string }>("/v0/submit-intent", { body: { type: "swap_transfer", signedData } });
    await rememberOrder({ depositAddress: pending.depositAddress, summary: pending.summary, at: Date.now() });
    return Response.json({ intentHash: r.intentHash, depositAddress: pending.depositAddress });
  } catch (e) {
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    const status = e instanceof OneClickError && e.status < 500 ? 422 : 502;
    return Response.json({ error: msg ? `NEAR Intents rejected the order: ${msg}` : "NEAR Intents rejected the order." }, { status });
  }
}
