import { oneclick, OneClickError, type UserTokens } from "@/lib/server/oneclick";
import { takeChallenge } from "@/lib/server/pending";
import { rateLimit } from "@/lib/server/ratelimit";
import { sessionFromTokens, writeSession } from "@/lib/server/session";
import { jsonObject, nep413Payload, str } from "@/lib/server/validate";
import { erc191SignedData, nep413SignedData, payloadText, signerOf, type SignPayload } from "@/lib/server/wallets";

// Step 2 of wallet sign-in: exchange the wallet-signed empty intent for a NEAR Intents user session.
export async function POST(req: Request) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;
  const b = await jsonObject(req);
  const standard = str(b?.standard);
  const signature = str(b?.signature);
  if (!b || !signature || (standard !== "erc191" && standard !== "nep413"))
    return Response.json({ error: "Incomplete wallet response" }, { status: 400 });

  let payload: SignPayload;
  let signedData: Record<string, unknown>;
  try {
    if (standard === "erc191") {
      const p = str(b.payload);
      if (!p) return Response.json({ error: "Incomplete wallet response" }, { status: 400 });
      payload = p;
      signedData = erc191SignedData(p, signature);
    } else {
      const p = nep413Payload(b.payload);
      const publicKey = str(b.publicKey);
      if (!p || !publicKey) return Response.json({ error: "Incomplete wallet response" }, { status: 400 });
      payload = p;
      const r = nep413SignedData(p, publicKey, signature);
      if (!r.valid) return Response.json({ error: "The wallet signature didn't verify" }, { status: 401 });
      signedData = r.signedData;
    }
  } catch {
    return Response.json({ error: "Unreadable wallet signature" }, { status: 400 });
  }

  const signerId = signerOf(payload);
  if (!signerId) return Response.json({ error: "Invalid payload" }, { status: 400 });
  // Single use: only the challenge this browser was handed, once, within 5 minutes.
  if (!(await takeChallenge(payloadText(payload))))
    return Response.json({ error: "This sign-in expired or was already used. Try again." }, { status: 409 });

  try {
    const tokens = await oneclick<UserTokens>("/v0/auth/authenticate", { body: { signedData } });
    await writeSession(sessionFromTokens(signerId, tokens, standard));
    return Response.json({ signerId });
  } catch (e) {
    const status = e instanceof OneClickError ? e.status : 502;
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    console.error("wallet sign-in rejected", msg || e);
    const error = /signature/i.test(msg)
      ? standard === "nep413"
        ? "NEAR Intents didn't accept this wallet's signature. If this is a .near account, its key may need registering first."
        : "NEAR Intents didn't accept this wallet's signature."
      : "NEAR Intents rejected the sign-in. Try again.";
    return Response.json({ error }, { status: status >= 500 ? 502 : 401 });
  }
}
