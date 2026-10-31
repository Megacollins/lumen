// Browser side of passkey sign-in. The passkey's public key is kept on this device so the server can derive the
// account id; cross-device lookup arrives with the username registry.

const STORE = "lumen.passkey";

export type StoredPasskey = { credentialId: string; publicKey: string };

const b64u = {
  enc: (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
};

export function passkeySupported() {
  return typeof window !== "undefined" && window.isSecureContext && !!window.PublicKeyCredential;
}

export function storedPasskey(): StoredPasskey | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as StoredPasskey) : null;
  } catch {
    return null;
  }
}

export function forgetPasskey() {
  try {
    localStorage.removeItem(STORE);
  } catch {}
}

/** Creates a P-256 passkey bound to this site and stores its public key locally. */
export async function createPasskey(): Promise<StoredPasskey> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "Lumen", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "Lumen account", displayName: "Lumen account" },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 = P-256, which NEAR Intents verifies
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey creation was cancelled");

  const spki = new Uint8Array((cred.response as AuthenticatorAttestationResponse).getPublicKey()!);
  const pk: StoredPasskey = { credentialId: cred.id, publicKey: b64u.enc(spki.slice(spki.length - 64)) };
  try {
    localStorage.setItem(STORE, JSON.stringify(pk));
  } catch {}
  return pk;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
}

/** Signs an empty intent with the passkey and opens a NEAR Intents session. */
export async function signInWithPasskey(pk: StoredPasskey): Promise<{ signerId: string }> {
  const { payload, challenge } = await post<{ payload: string; challenge: string }>("/api/auth/challenge", {
    publicKey: pk.publicKey,
  });
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: b64u.dec(challenge),
      allowCredentials: [{ type: "public-key", id: b64u.dec(pk.credentialId) }],
      userVerification: "required",
    },
  })) as PublicKeyCredential | null;
  if (!a) throw new Error("Sign-in was cancelled");
  const r = a.response as AuthenticatorAssertionResponse;

  return post("/api/auth/verify", {
    payload,
    publicKey: pk.publicKey,
    signatureDer: b64u.enc(r.signature),
    clientDataJSON: new TextDecoder().decode(r.clientDataJSON),
    authenticatorData: b64u.enc(r.authenticatorData),
  });
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
}
