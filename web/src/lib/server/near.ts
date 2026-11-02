// Minimal NEAR RPC client (view calls only), with a fallback endpoint.
const RPC = ["https://rpc.mainnet.near.org", "https://free.rpc.fastnear.com"];

type RpcResult = { result?: Record<string, unknown> & { result?: number[] }; error?: { cause?: { name?: string }; data?: string } };

async function rpc(params: Record<string, unknown>): Promise<RpcResult | null> {
  for (const url of RPC) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "lumen", method: "query", params }),
        cache: "no-store",
      });
      const j = (await res.json()) as RpcResult;
      if (j.result || j.error) return j;
    } catch {}
  }
  return null;
}

/** Does this named NEAR account exist? null when NEAR can't be reached. */
export async function nearAccountExists(accountId: string): Promise<boolean | null> {
  const j = await rpc({ request_type: "view_account", finality: "final", account_id: accountId });
  if (!j) return null;
  if (j.result) return true;
  const unknown = j.error?.cause?.name === "UNKNOWN_ACCOUNT" || /does not exist/i.test(j.error?.data ?? "");
  return unknown ? false : null;
}

/** intents.near has_public_key(account_id, public_key). null when NEAR can't be reached. */
export async function intentsHasPublicKey(accountId: string, publicKey: string): Promise<boolean | null> {
  const args = Buffer.from(JSON.stringify({ account_id: accountId, public_key: publicKey })).toString("base64");
  const j = await rpc({ request_type: "call_function", finality: "final", account_id: "intents.near", method_name: "has_public_key", args_base64: args });
  if (!j?.result?.result) return null;
  return JSON.parse(Buffer.from(j.result.result).toString()) === true;
}

/** Implicit accounts (0x + 40 hex, or 64 hex) exist by construction; named ones (alice.near) must be created first. */
export const isNamedNearAccount = (id: string) => !/^0x[0-9a-f]{40}$/.test(id) && !/^[0-9a-f]{64}$/.test(id);
