import { oneclick, OneClickError, type UserTokens } from "@/lib/server/oneclick";
import { webauthnSignedData, type Assertion } from "@/lib/server/passkey";
import { sessionFromTokens, writeSession } from "@/lib/server/session";

// Step 2 of passkey sign-in: exchange the signed empty intent for a NEAR Intents user session.
export async function POST(req: Request) {
  const a = (await req.json().catch(() => null)) as Assertion | null;
  if (!a?.payload || !a.publicKey || !a.signatureDer || !a.clientDataJSON || !a.authenticatorData)
    return Response.json({ error: "Incomplete passkey response" }, { status: 400 });

  let signerId: string;
  try {
    signerId = JSON.parse(a.payload).signer_id;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { valid, signedData } = webauthnSignedData(a);
  if (!valid) return Response.json({ error: "Passkey signature did not verify" }, { status: 401 });

  try {
    const tokens = await oneclick<UserTokens>("/v0/auth/authenticate", { body: { signedData } });
    await writeSession(sessionFromTokens(signerId, tokens));
    return Response.json({ signerId });
  } catch (e) {
    const status = e instanceof OneClickError ? e.status : 502;
    return Response.json({ error: "NEAR Intents rejected the sign-in" }, { status: status >= 500 ? 502 : 401 });
  }
}
