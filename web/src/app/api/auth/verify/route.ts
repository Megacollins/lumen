import { oneclick, OneClickError, type UserTokens } from "@/lib/server/oneclick";
import { requestOrigin, webauthnContextOk, webauthnSignedData } from "@/lib/server/passkey";
import { takeChallenge } from "@/lib/server/pending";
import { assertion, jsonObject } from "@/lib/server/validate";
import { sessionFromTokens, writeSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

// Step 2 of passkey sign-in: exchange the signed empty intent for a NEAR Intents user session.
export async function POST(req: Request) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;
  const a = assertion(await jsonObject(req));
  if (!a) return Response.json({ error: "Incomplete passkey response" }, { status: 400 });

  let signerId: string;
  try {
    signerId = JSON.parse(a.payload).signer_id;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { valid, signedData } = webauthnSignedData(a);
  if (!valid) return Response.json({ error: "Passkey signature did not verify" }, { status: 401 });
  if (!webauthnContextOk(a, requestOrigin(req))) return Response.json({ error: "Passkey response wasn't made on this site" }, { status: 401 });
  // Single use: only the challenge this browser was handed, once, within 5 minutes.
  if (!(await takeChallenge(a.payload)))
    return Response.json({ error: "This sign-in expired or was already used. Try again." }, { status: 409 });

  try {
    const tokens = await oneclick<UserTokens>("/v0/auth/authenticate", { body: { signedData } });
    await writeSession(sessionFromTokens(signerId, tokens));
    return Response.json({ signerId });
  } catch (e) {
    const status = e instanceof OneClickError ? e.status : 502;
    return Response.json({ error: "NEAR Intents rejected the sign-in" }, { status: status >= 500 ? 502 : 401 });
  }
}
