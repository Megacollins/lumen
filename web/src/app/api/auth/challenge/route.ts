import { base64urlnopad } from "@scure/base";
import { ownershipPayload, p256SignerId } from "@/lib/server/passkey";

// Step 1 of passkey sign-in: build the empty intent the passkey must sign.
export async function POST(req: Request) {
  const { publicKey } = (await req.json().catch(() => ({}))) as { publicKey?: string };
  let pub: Uint8Array;
  try {
    pub = base64urlnopad.decode(publicKey ?? "");
  } catch {
    return Response.json({ error: "Invalid public key" }, { status: 400 });
  }
  if (pub.length !== 64) return Response.json({ error: "Public key must be 64 bytes" }, { status: 400 });

  const signerId = p256SignerId(pub);
  const { payload, challenge } = await ownershipPayload(signerId);
  return Response.json({ signerId, payload, challenge });
}
