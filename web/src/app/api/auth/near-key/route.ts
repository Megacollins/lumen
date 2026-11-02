import { isIntentsAccount } from "@/lib/cash";

const RPC = ["https://rpc.mainnet.near.org", "https://free.rpc.fastnear.com"];

/**
 * Is this NEAR wallet key registered with NEAR Intents for the account? Named accounts (alice.near) must register
 * their key once (intents.near add_public_key) before they can sign intents; implicit accounts are their own key.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const accountId = (u.searchParams.get("accountId") ?? "").toLowerCase();
  const publicKey = u.searchParams.get("publicKey") ?? "";
  if (!isIntentsAccount(accountId) || !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(publicKey))
    return Response.json({ error: "Invalid account or key" }, { status: 400 });

  const args = Buffer.from(JSON.stringify({ account_id: accountId, public_key: publicKey })).toString("base64");
  for (const url of RPC) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "lumen",
          method: "query",
          params: { request_type: "call_function", finality: "final", account_id: "intents.near", method_name: "has_public_key", args_base64: args },
        }),
        cache: "no-store",
      });
      const j = (await res.json()) as { result?: { result: number[] } };
      if (j.result) return Response.json({ registered: JSON.parse(Buffer.from(j.result.result).toString()) === true });
    } catch {}
  }
  return Response.json({ error: "Couldn't reach NEAR to check the key." }, { status: 502 });
}
