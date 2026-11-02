import { isIntentsAccount } from "@/lib/cash";
import { intentsHasPublicKey } from "@/lib/server/near";
import { rateLimit } from "@/lib/server/ratelimit";

/**
 * Is this NEAR wallet key registered with NEAR Intents for the account? Named accounts (alice.near) must register
 * their key once (intents.near add_public_key) before they can sign intents; implicit accounts are their own key.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;
  const u = new URL(req.url);
  const accountId = (u.searchParams.get("accountId") ?? "").toLowerCase();
  const publicKey = u.searchParams.get("publicKey") ?? "";
  if (!isIntentsAccount(accountId) || !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(publicKey))
    return Response.json({ error: "Invalid account or key" }, { status: 400 });

  const registered = await intentsHasPublicKey(accountId, publicKey);
  if (registered === null) return Response.json({ error: "Couldn't reach NEAR to check the key." }, { status: 502 });
  return Response.json({ registered });
}
