import { oneclick, OneClickError, type UserTokens } from "@/lib/server/oneclick";
import { sessionFromTokens, writeSession } from "@/lib/server/session";
import { erc191SignedData, nep413SignedData, signerOf, type Nep413Payload } from "@/lib/server/wallets";

type Body =
  | { standard: "erc191"; payload: string; signature: string }
  | { standard: "nep413"; payload: Nep413Payload; publicKey: string; signature: string };

// Step 2 of wallet sign-in: exchange the wallet-signed empty intent for a NEAR Intents user session.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b?.payload || !b.signature) return Response.json({ error: "Incomplete wallet response" }, { status: 400 });

  const signerId = signerOf(b.payload);
  if (!signerId) return Response.json({ error: "Invalid payload" }, { status: 400 });

  let signedData: Record<string, unknown>;
  try {
    if (b.standard === "erc191") {
      signedData = erc191SignedData(b.payload, b.signature);
    } else if (b.standard === "nep413") {
      const r = nep413SignedData(b.payload, b.publicKey, b.signature);
      if (!r.valid) return Response.json({ error: "The wallet signature didn't verify" }, { status: 401 });
      signedData = r.signedData;
    } else {
      return Response.json({ error: "Unsupported wallet" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Unreadable wallet signature" }, { status: 400 });
  }

  try {
    const tokens = await oneclick<UserTokens>("/v0/auth/authenticate", { body: { signedData } });
    await writeSession(sessionFromTokens(signerId, tokens, b.standard));
    return Response.json({ signerId });
  } catch (e) {
    const status = e instanceof OneClickError ? e.status : 502;
    const msg = e instanceof OneClickError ? String((e.body as { message?: string })?.message ?? "") : "";
    // A NEAR named account whose key isn't registered with NEAR Intents yet fails here.
    return Response.json({ error: "NEAR Intents rejected the sign-in", detail: msg || undefined }, { status: status >= 500 ? 502 : 401 });
  }
}
