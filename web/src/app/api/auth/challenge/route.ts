import { base64urlnopad } from "@scure/base";
import { isIntentsAccount } from "@/lib/cash";
import { ownershipPayload, p256SignerId } from "@/lib/server/passkey";
import { payloadText, toNep413 } from "@/lib/server/wallets";
import { writeChallenge } from "@/lib/server/pending";
import { jsonObject, str } from "@/lib/server/validate";
import { rateLimit } from "@/lib/server/ratelimit";

// Step 1 of sign-in: build the empty intent the passkey or wallet must sign. It proves ownership and moves nothing.
export async function POST(req: Request) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;
  const b = (await jsonObject(req)) ?? {};
  const body = { standard: str(b.standard), publicKey: str(b.publicKey), address: str(b.address), accountId: str(b.accountId) };

  if (body.standard === "erc191") {
    const address = body.address?.trim() ?? "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
    const signerId = address.toLowerCase();
    const { payload } = await ownershipPayload(signerId);
    await writeChallenge(payload);
    return Response.json({ signerId, payload });
  }

  if (body.standard === "nep413") {
    const accountId = body.accountId?.trim().toLowerCase() ?? "";
    if (!isIntentsAccount(accountId)) return Response.json({ error: "Invalid NEAR account" }, { status: 400 });
    const { payload } = await ownershipPayload(accountId);
    const nep = toNep413(payload);
    await writeChallenge(payloadText(nep));
    return Response.json({ signerId: accountId, payload: nep });
  }

  let pub: Uint8Array;
  try {
    pub = base64urlnopad.decode(body.publicKey ?? "");
  } catch {
    return Response.json({ error: "Invalid public key" }, { status: 400 });
  }
  if (pub.length !== 64) return Response.json({ error: "Public key must be 64 bytes" }, { status: 400 });

  const signerId = p256SignerId(pub);
  const { payload, challenge } = await ownershipPayload(signerId);
  await writeChallenge(payload);
  return Response.json({ signerId, payload, challenge });
}
