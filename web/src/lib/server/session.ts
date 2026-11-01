import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { oneclick, type UserTokens } from "./oneclick";

// The Intents user-session tokens live only in an encrypted, httpOnly cookie.
const COOKIE = "lumen_session";

export type Session = {
  signerId: string;
  standard: "webauthn";
  /** Demo sessions have no NEAR Intents tokens: balances are simulated in the browser, quotes are real. */
  demo?: boolean;
  accessToken: string;
  accessExpiresAt: number; // ms
  refreshToken: string;
  refreshExpiresAt: number; // ms
};

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM, keyed by SESSION_SECRET. Also used for the pending-intent cookie (lib/server/pending.ts). */
export function seal(data: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal<T = Session>(value: string): T | null {
  try {
    const buf = Buffer.from(value, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export function sessionFromTokens(signerId: string, t: UserTokens): Session {
  const now = Date.now();
  return {
    signerId,
    standard: "webauthn",
    accessToken: t.accessToken,
    accessExpiresAt: now + t.expiresIn * 1000,
    refreshToken: t.refreshToken,
    refreshExpiresAt: now + t.refreshExpiresIn * 1000,
  };
}

/** A recognisable, unowned account id used as the quote recipient in demo mode. */
export const DEMO_SIGNER_ID = "0x000000000000000000000000000000000000d3a0";

export function demoSession(): Session {
  const day = Date.now() + 24 * 60 * 60 * 1000;
  return { signerId: DEMO_SIGNER_ID, standard: "webauthn", demo: true, accessToken: "", accessExpiresAt: day, refreshToken: "", refreshExpiresAt: day };
}

export async function writeSession(s: Session) {
  (await cookies()).set(COOKIE, seal(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(s.refreshExpiresAt),
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Reads the session, refreshing the access token when it is within a minute of expiry. Route handlers only. */
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const s = raw ? unseal(raw) : null;
  if (!s) return null;
  const now = Date.now();
  if (s.refreshExpiresAt <= now) return null;
  if (s.demo || s.accessExpiresAt - 60_000 > now) return s;
  const r = await oneclick<{ accessToken: string; expiresIn: number }>("/v0/auth/refresh", {
    body: { refreshToken: s.refreshToken },
  });
  const next = { ...s, accessToken: r.accessToken, accessExpiresAt: now + r.expiresIn * 1000 };
  await writeSession(next);
  return next;
}
