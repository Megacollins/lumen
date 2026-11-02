import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { webauthnSignedData, type Assertion } from "@/lib/server/passkey";
import { rememberOrder, sha256Hex, takePending } from "@/lib/server/pending";
import { getSession } from "@/lib/server/session";
import { erc191SignedData, nep413SignedData, payloadText, type Nep413Payload } from "@/lib/server/wallets";

type Body =
  | ({ standard?: "webauthn" } & Assertion)
  | { standard: "erc191"; payload: string; signature: string }
  | { standard: "nep413"; payload: Nep413Payload; publicKey: string; signature: string };

/**
 * Step 2 of a real order: the signed intent goes to NEAR Intents.
 * Only the exact payload handed out by /api/execute/prepare, within its 5-minute window, is accepted, and only from
 * the signer type this account uses (passkey, EVM wallet or NEAR wallet).
 */
export async function POST(req: Request) {
  const session = await getSession().catch(() => null);
  if (!session || session.demo) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b?.payload) return Response.json({ error: "Incomplete signature." }, { status: 400 });
  const standard = b.standard ?? "webauthn";
  if (standard !== session.standard) return Response.json({ error: "This account signs a different way." }, { status: 400 });

  const pending = await takePending(session.signerId);
  if (!pending || pending.payloadHash !== sha256Hex(payloadText(b.payload)))
    return Response.json({ error: "This order expired or was already used. Start again for a fresh quote." }, { status: 409 });

  let signedData: Record<string, unknown>;
  try {
    if (b.standard === "erc191") {
      signedData = erc191SignedData(b.payload, b.signature);
    } else if (b.standard === "nep413") {
      const r = nep413SignedData(b.payload, b.publicKey, b.signature);
      if (!r.valid) return Response.json({ error: "The wallet signature didn't verify." }, { status: 401 });
      signedData = r.signedData;
    } else {
      const a = b as Assertion;
      if (!a.publicKey || !a.signatureDer || !a.clientDataJSON || !a.authenticatorData)
        return Response.json({ error: "Incomplete passkey response." }, { status: 400 });
      const r = webauthnSignedData(a);
      if (!r.valid) return Response.json({ error: "The passkey signature didn't verify." }, { status: 401 });
      signedData = r.signedData;
    }
  } catch {
    return Response.json({ error: "Unreadable signature." }, { status: 400 });
  }

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
