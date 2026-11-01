import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { base64urlnopad } from "@scure/base";
import type { Receipt } from "./demo-ledger";
import { CANDIDATE_ASSETS, USDC } from "./markets";
import { storedPasskey } from "./passkey-client";

// A self-attested account statement. Signed with the account's passkey so a reader can check it came from the
// owner of the NEAR Intents account. It is NOT a proof issued by NEAR Intents.

export type StatementInput = {
  signerId: string;
  demo: boolean;
  balances: { tokenId: string; available: string }[];
  prices: Record<string, number | null>;
  activity: Receipt[];
};

export function buildStatement(i: StatementInput) {
  const holdings = i.balances.map((b) => {
    const asset = b.tokenId === USDC.assetId ? { symbol: "USDC", decimals: USDC.decimals } : CANDIDATE_ASSETS.find((a) => a.assetId === b.tokenId);
    const amount = Number(b.available) / 10 ** (asset?.decimals ?? 18);
    const price = asset?.symbol === "USDC" ? 1 : asset ? i.prices[asset.symbol] ?? null : null;
    return { tokenId: b.tokenId, symbol: asset?.symbol ?? null, amount, priceUsd: price, valueUsd: price == null ? null : amount * price };
  });
  return {
    type: "lumen.statement.v1",
    account: i.signerId,
    network: "NEAR Intents (Confidential Intents)",
    generatedAt: new Date().toISOString(),
    demo: i.demo,
    holdings,
    totalUsd: holdings.reduce((s, h) => s + (h.valueUsd ?? 0), 0),
    activity: i.activity.map((r) => ({ at: new Date(r.at).toISOString(), kind: r.kind, title: r.title, detail: r.detail, cashDeltaUsd: r.cashDelta })),
    notice: i.demo
      ? "Demo statement: simulated balances, not a real account."
      : "Self-attested by the account owner's passkey. Balances were read from NEAR Intents at generatedAt.",
  };
}

const b64u = (buf: ArrayBuffer) => base64urlnopad.encode(new Uint8Array(buf));

function p256SignerId(pub64: Uint8Array) {
  return "0x" + bytesToHex(keccak_256(concatBytes(utf8ToBytes("p256"), pub64)).slice(12));
}

/**
 * Signs the statement with the passkey stored on this device. The WebAuthn challenge is sha256 of the statement
 * JSON, so the signature covers its exact bytes. Returns null when this device has no matching passkey.
 */
export async function signStatement(statement: ReturnType<typeof buildStatement>) {
  const pk = storedPasskey();
  if (!pk) return null;
  const pub = base64urlnopad.decode(pk.publicKey);
  if (p256SignerId(pub) !== statement.account) return null;

  const body = JSON.stringify(statement);
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(sha256(utf8ToBytes(body))),
      allowCredentials: [{ type: "public-key", id: new Uint8Array(base64urlnopad.decode(pk.credentialId.replace(/=+$/, ""))) }],
      userVerification: "required",
    },
  })) as PublicKeyCredential | null;
  if (!a) return null;
  const r = a.response as AuthenticatorAssertionResponse;
  return {
    statement: body,
    signature: {
      scheme: "webauthn-p256",
      publicKey: "p256:" + pk.publicKey,
      signatureDer: b64u(r.signature),
      clientDataJSON: new TextDecoder().decode(r.clientDataJSON),
      authenticatorData: b64u(r.authenticatorData),
      howToVerify:
        "challenge in clientDataJSON = base64url(sha256(statement)); verify the ES256 signature over authenticatorData ‖ sha256(clientDataJSON) with publicKey (x‖y, base64url); account = 0x + last 20 bytes of keccak256('p256' ‖ x ‖ y).",
    },
  };
}

export function download(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
