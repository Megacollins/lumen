// Request-body guards: every route reads fields through these, so a wrong type (array, number, null) is a clean 400
// instead of a crash.

/** The JSON body if it is a plain object, else null. */
export async function jsonObject(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const j: unknown = await req.json();
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The value if it is a string, else undefined. */
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** A NEP-413 payload with string fields, else null. */
export function nep413Payload(v: unknown): { message: string; nonce: string; recipient: string; callbackUrl?: string | null } | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.message !== "string" || typeof o.nonce !== "string" || typeof o.recipient !== "string") return null;
  if (o.callbackUrl != null && typeof o.callbackUrl !== "string") return null;
  return { message: o.message, nonce: o.nonce, recipient: o.recipient, ...(o.callbackUrl ? { callbackUrl: o.callbackUrl as string } : {}) };
}

/** A browser passkey assertion with every field a string, else null. */
export function assertion(o: Record<string, unknown> | null) {
  if (!o) return null;
  const f = ["payload", "publicKey", "signatureDer", "clientDataJSON", "authenticatorData"] as const;
  if (!f.every((k) => typeof o[k] === "string" && o[k])) return null;
  return {
    payload: o.payload as string,
    publicKey: o.publicKey as string,
    signatureDer: o.signatureDer as string,
    clientDataJSON: o.clientDataJSON as string,
    authenticatorData: o.authenticatorData as string,
  };
}
