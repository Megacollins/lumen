// Browser side of wallet sign-in and wallet-signed orders: EVM wallets (MetaMask and others, EIP-1193 + personal_sign)
// and NEAR wallets (Meteor, HOT, Intear via NEAR Wallet Selector, NEP-413 signMessage). The NEAR selector is loaded
// only when someone picks a NEAR wallet, so nobody else downloads it.
import { post } from "./passkey-client";

const STORE = "lumen.signer";

export type StoredSigner = { kind: "evm"; address: string } | { kind: "near"; accountId: string; walletId: string };

export function storedSigner(): StoredSigner | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as StoredSigner) : null;
  } catch {
    return null;
  }
}

function remember(s: StoredSigner | null) {
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s));
    else localStorage.removeItem(STORE);
  } catch {}
}

/* ---------- EVM (MetaMask, Rabby, Coinbase Wallet extension…) ---------- */

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
const eth = () => (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);

export const evmAvailable = () => !!eth();

const utf8Hex = (s: string) => "0x" + Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");

async function evmSign(address: string, message: string) {
  const provider = eth();
  if (!provider) throw new Error("No EVM wallet found in this browser.");
  return (await provider.request({ method: "personal_sign", params: [utf8Hex(message), address] })) as string;
}

export async function signInWithEvm(): Promise<{ signerId: string }> {
  const provider = eth();
  if (!provider) throw new Error("No EVM wallet found. Install MetaMask, or open Lumen in your wallet's browser.");
  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!address) throw new Error("The wallet didn't share an account.");
  const { payload } = await post<{ payload: string }>("/api/auth/challenge", { standard: "erc191", address });
  const signature = await evmSign(address, payload);
  const r = await post<{ signerId: string }>("/api/auth/wallet", { standard: "erc191", payload, signature });
  remember({ kind: "evm", address });
  return r;
}

/* ---------- NEAR (Meteor, HOT, Intear) ---------- */

type Nep413Payload = { message: string; nonce: string; recipient: string };
type Selector = Awaited<ReturnType<typeof import("@near-wallet-selector/core").setupWalletSelector>>;
let selectorPromise: Promise<Selector> | null = null;

function nearSelector() {
  selectorPromise ??= (async () => {
    const [{ setupWalletSelector }, { setupMeteorWallet }, { setupHereWallet }, { setupIntearWallet }] = await Promise.all([
      import("@near-wallet-selector/core"),
      import("@near-wallet-selector/meteor-wallet"),
      import("@near-wallet-selector/here-wallet"),
      import("@near-wallet-selector/intear-wallet"),
    ]);
    return setupWalletSelector({ network: "mainnet", modules: [setupMeteorWallet(), setupHereWallet(), setupIntearWallet()] });
  })();
  return selectorPromise;
}

export async function nearWalletOptions() {
  const s = await nearSelector();
  return s.store.getState().modules.map((m) => ({ id: m.id, name: m.metadata.name, icon: m.metadata.iconUrl, available: m.metadata.available }));
}

const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function nearSign(walletId: string, payload: Nep413Payload) {
  const wallet = await (await nearSelector()).wallet(walletId);
  if (!("signMessage" in wallet) || !wallet.signMessage) throw new Error("This wallet can't sign messages.");
  const signed = await wallet.signMessage({
    message: payload.message,
    recipient: payload.recipient,
    nonce: b64ToBytes(payload.nonce) as unknown as Buffer, // the selector only reads the bytes
  });
  if (!signed) throw new Error("The wallet didn't return a signature.");
  return signed;
}

export type NearRegistration = { walletId: string; accountId: string; publicKey: string; finish: () => Promise<{ signerId: string }> };

const keyRegistered = async (accountId: string, publicKey: string) => {
  const res = await fetch(`/api/auth/near-key?accountId=${encodeURIComponent(accountId)}&publicKey=${encodeURIComponent(publicKey)}`);
  return ((await res.json().catch(() => ({}))) as { registered?: boolean }).registered;
};

/**
 * Connects a NEAR wallet without creating any access key (no contractId), then signs the sign-in intent.
 * A named account whose key isn't registered with NEAR Intents gets `needsRegistration`, holding the signature already
 * made: after registerNearKey(), `finish()` completes sign-in without asking the wallet again.
 */
export async function signInWithNear(walletId: string): Promise<{ signerId: string } | { needsRegistration: NearRegistration }> {
  const wallet = await (await nearSelector()).wallet(walletId);
  if (wallet.type === "hardware" || wallet.type === "bridge") throw new Error("This wallet type isn't supported yet.");
  const accounts = await wallet.signIn({});
  const accountId = accounts?.[0]?.accountId;
  if (!accountId) throw new Error("The wallet didn't share an account.");

  const { payload } = await post<{ payload: Nep413Payload }>("/api/auth/challenge", { standard: "nep413", accountId });
  const signed = await nearSign(walletId, payload);

  const finish = async () => {
    const r = await post<{ signerId: string }>("/api/auth/wallet", { standard: "nep413", payload, publicKey: signed.publicKey, signature: signed.signature });
    remember({ kind: "near", accountId: signed.accountId, walletId });
    return r;
  };

  // Named accounts must register this key with NEAR Intents once before it accepts their signatures.
  const implicit = /^[0-9a-f]{64}$/.test(signed.accountId);
  if (!implicit && (await keyRegistered(signed.accountId, signed.publicKey)) === false)
    return { needsRegistration: { walletId, accountId: signed.accountId, publicKey: signed.publicKey, finish } };
  return finish();
}

/** After the registration transaction, waits (up to ~15s) for NEAR to show the key, then finishes sign-in. */
export async function finishAfterRegistration(reg: NearRegistration) {
  for (let i = 0; i < 6; i++) {
    if (await keyRegistered(reg.accountId, reg.publicKey)) return reg.finish();
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("NEAR hasn't confirmed the key registration yet. Wait a moment and sign in again.");
}

/** One-time NEAR transaction: intents.near add_public_key, 1 yoctoNEAR deposit, paid from the user's NEAR for gas. */
export async function registerNearKey(walletId: string, publicKey: string) {
  const [{ actionCreators }, selector] = await Promise.all([import("@near-js/transactions"), nearSelector()]);
  const wallet = await selector.wallet(walletId);
  await wallet.signAndSendTransaction({
    receiverId: "intents.near",
    actions: [actionCreators.functionCall("add_public_key", { public_key: publicKey }, BigInt(30_000_000_000_000), BigInt(1))],
  });
}

export async function signOutWallet() {
  const s = storedSigner();
  remember(null);
  if (s?.kind === "near") {
    try {
      await (await (await nearSelector()).wallet(s.walletId)).signOut();
    } catch {}
  }
}

/* ---------- Orders ---------- */

/** Signs an order payload from /api/execute/prepare with this browser's wallet; returns the fields /api/execute/submit takes. */
export async function signOrderWithWallet(standard: "erc191" | "nep413", payload: string | Nep413Payload) {
  const s = storedSigner();
  if (standard === "erc191") {
    if (s?.kind !== "evm" || typeof payload !== "string") throw new Error("Connect the EVM wallet you signed in with.");
    return { standard, payload, signature: await evmSign(s.address, payload) };
  }
  if (s?.kind !== "near" || typeof payload === "string") throw new Error("Connect the NEAR wallet you signed in with.");
  const signed = await nearSign(s.walletId, payload);
  return { standard, payload, publicKey: signed.publicKey, signature: signed.signature };
}

/* ---------- Statements ---------- */

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");

/**
 * Signs a statement with this browser's wallet: the signed text names the account and the statement's sha256, so the
 * signature covers its exact bytes. Returns null when this browser isn't connected to the account's wallet.
 */
export async function signStatementWithWallet(account: string, body: string) {
  const s = storedSigner();
  const digest = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)));
  const text = `Lumen statement for ${account}\nsha256:${digest}`;
  if (s?.kind === "evm" && s.address.toLowerCase() === account) {
    return {
      statement: body,
      signature: {
        scheme: "erc191-personal_sign",
        address: s.address,
        message: text,
        signature: await evmSign(s.address, text),
        howToVerify: "sha256(statement) must equal the hash in message; recover the signer of message (EIP-191 personal_sign) and compare it to address.",
      },
    };
  }
  if (s?.kind === "near" && s.accountId === account) {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const payload = { message: text, nonce, recipient: "lumen-statement" };
    const signed = await nearSign(s.walletId, payload);
    return {
      statement: body,
      signature: {
        scheme: "nep413",
        accountId: s.accountId,
        publicKey: signed.publicKey,
        payload,
        signature: signed.signature,
        howToVerify: "sha256(statement) must equal the hash in payload.message; verify the NEP-413 ed25519 signature over payload with publicKey, and that the key belongs to accountId on NEAR.",
      },
    };
  }
  return null;
}
