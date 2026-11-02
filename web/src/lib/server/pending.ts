import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { seal, unseal } from "./session";

// What the server handed out for signing, and the orders this browser placed. Encrypted, httpOnly.
const PENDING = "lumen_pending";
const CHALLENGE = "lumen_challenge";
const ORDERS = "lumen_orders";
const SIGN_WINDOW_MS = 5 * 60_000;

export type Pending = { signerId: string; payloadHash: string; depositAddress: string; summary: string; expiresAt: number };
/** An order this browser placed. Bound to the account that placed it, so another account here never sees it. */
export type OrderRef = {
  signerId: string;
  depositAddress: string;
  summary: string;
  at: number;
  /** "deposit": money arrives at depositAddress from another chain; "signed": an intent signed from the balance. */
  kind: "deposit" | "signed";
  /** Deposits only: what to send, so the address stays usable after the sheet closes. */
  deposit?: { amount: string; chain: string; memo: string | null; deadline: string | null };
};

export const sha256Hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };

/** Several orders can be awaiting a signature at once (two tabs or sheets); each is kept until used or expired. */
export async function writePending(p: Omit<Pending, "expiresAt">) {
  const jar = await cookies();
  const now = Date.now();
  const next = [...(await readPending()).filter((x) => x.expiresAt > now), { ...p, expiresAt: now + SIGN_WINDOW_MS }].slice(-5);
  jar.set(PENDING, seal(next), { ...opts, maxAge: SIGN_WINDOW_MS / 1000 });
}

/** The pending list, accepting the older single-object cookie shape too. */
async function readPending(): Promise<Pending[]> {
  const raw = (await cookies()).get(PENDING)?.value;
  const parsed = raw ? unseal<Pending[] | Pending>(raw) : null;
  return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
}

const submitted = new Map<string, number>();

/**
 * The prepared order this signature is for, removed so it can't be used twice. Matches by payload hash, so several
 * prepared orders can coexist. The in-memory record also stops two simultaneous submits of the same signed order.
 */
export async function takePending(signerId: string, payloadHash: string): Promise<Pending | null> {
  const now = Date.now();
  for (const [h, t] of submitted) if (t < now) submitted.delete(h);
  if (submitted.has(payloadHash)) return null;

  const jar = await cookies();
  const list = await readPending();
  const hit = list.find((x) => x.payloadHash === payloadHash && x.signerId === signerId && x.expiresAt > now) ?? null;
  const rest = list.filter((x) => x !== hit && x.expiresAt > now);
  if (rest.length) jar.set(PENDING, seal(rest), { ...opts, maxAge: SIGN_WINDOW_MS / 1000 });
  else jar.delete(PENDING);
  if (hit) submitted.set(payloadHash, now + 24 * 3600_000);
  return hit;
}

export async function rememberOrder(o: OrderRef) {
  const jar = await cookies();
  const raw = jar.get(ORDERS)?.value;
  const list = (raw ? unseal<OrderRef[]>(raw) : null) ?? [];
  const next = [o, ...list.filter((x) => x.depositAddress !== o.depositAddress)].slice(0, 10);
  jar.set(ORDERS, seal(next), { ...opts, maxAge: 7 * 24 * 3600 });
}

async function allOrders(): Promise<OrderRef[]> {
  const raw = (await cookies()).get(ORDERS)?.value;
  return (raw ? unseal<OrderRef[]>(raw) : null) ?? [];
}

/** This account's orders on this browser, newest first. */
export async function ordersOf(signerId: string): Promise<OrderRef[]> {
  return (await allOrders()).filter((x) => x.signerId === signerId);
}

export async function knownOrder(depositAddress: string, signerId: string): Promise<OrderRef | null> {
  return (await allOrders()).find((x) => x.depositAddress === depositAddress && x.signerId === signerId) ?? null;
}

/* ---------- Sign-in challenges (single use) ---------- */

const usedChallenges = new Map<string, number>();

/** Remembers the sign-in challenge handed to this browser (its hash), valid for 5 minutes. */
export async function writeChallenge(payloadText: string) {
  const c = { hash: sha256Hex(payloadText), expiresAt: Date.now() + SIGN_WINDOW_MS };
  (await cookies()).set(CHALLENGE, seal(c), { ...opts, maxAge: SIGN_WINDOW_MS / 1000 });
}

/**
 * True once per challenge: it must be the one this browser was handed, still fresh, and not already used here.
 * The in-memory record also stops two simultaneous replays of the same signed sign-in on this server instance.
 */
export async function takeChallenge(payloadText: string): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE)?.value;
  jar.delete(CHALLENGE);
  const c = raw ? unseal<{ hash: string; expiresAt: number }>(raw) : null;
  const hash = sha256Hex(payloadText);
  const now = Date.now();
  for (const [h, t] of usedChallenges) if (t < now) usedChallenges.delete(h);
  if (!c || c.hash !== hash || c.expiresAt < now || usedChallenges.has(hash)) return false;
  usedChallenges.set(hash, c.expiresAt);
  return true;
}
