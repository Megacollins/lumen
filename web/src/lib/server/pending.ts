import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { seal, unseal } from "./session";

// What the server handed out for signing, and the orders this browser placed. Encrypted, httpOnly.
const PENDING = "lumen_pending";
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

export async function writePending(p: Omit<Pending, "expiresAt">) {
  (await cookies()).set(PENDING, seal({ ...p, expiresAt: Date.now() + SIGN_WINDOW_MS }), { ...opts, maxAge: SIGN_WINDOW_MS / 1000 });
}

/** The intent this browser was asked to sign, if it is still within its signing window. Single use. */
export async function takePending(signerId: string): Promise<Pending | null> {
  const jar = await cookies();
  const raw = jar.get(PENDING)?.value;
  jar.delete(PENDING);
  const p = raw ? unseal<Pending>(raw) : null;
  return p && p.signerId === signerId && p.expiresAt > Date.now() ? p : null;
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
