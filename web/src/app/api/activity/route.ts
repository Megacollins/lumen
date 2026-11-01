import { CHAINS } from "@/lib/cash";
import { CANDIDATE_ASSETS, USDC } from "@/lib/markets";
import { oneclick, OneClickError } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

type HistoryItem = {
  status: "PENDING_DEPOSIT" | "INCOMPLETE_DEPOSIT" | "PROCESSING" | "SUCCESS" | "REFUNDED" | "FAILED";
  depositType: string;
  recipientType: string;
  createdAt: string;
  depositAddress: string;
  originAsset?: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  destinationAsset?: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  recipient?: string;
};

function label(assetId?: string) {
  if (!assetId) return "?";
  if (assetId === USDC.assetId) return "USDC";
  const a = CANDIDATE_ASSETS.find((x) => x.assetId === assetId);
  if (a) return a.symbol;
  const c = CHAINS.find((x) => x.assetId === assetId);
  return c ? `USDC on ${c.name}` : assetId.split(":").pop()!.slice(0, 12);
}

/**
 * Transaction history for the signed-in account, from NEAR Intents.
 * The history endpoint is invite-only for now; when it refuses, say so instead of showing an empty list as truth.
 */
export async function GET() {
  const s = await getSession().catch(() => null);
  if (!s) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (s.demo) return Response.json({ demo: true, available: true, items: [] });

  try {
    const h = await oneclick<{ items: HistoryItem[] }>("/v0/account/history?limit=50", { userToken: s.accessToken });
    const items = h.items.map((i) => ({
      id: i.depositAddress,
      at: Date.parse(i.createdAt),
      status: i.status,
      title: `${label(i.originAsset)} → ${label(i.destinationAsset)}`,
      detail: i.recipientType === "DESTINATION_CHAIN" ? `To ${i.recipient ?? "external address"}` : i.recipient === s.signerId ? "Within your account" : `To ${i.recipient ?? "?"}`,
      amountIn: i.amountInFormatted ? `${i.amountInFormatted} ${label(i.originAsset)}` : null,
      amountOut: i.amountOutFormatted ? `${i.amountOutFormatted} ${label(i.destinationAsset)}` : null,
      confidential: i.depositType === "CONFIDENTIAL_INTENTS" || i.recipientType === "CONFIDENTIAL_INTENTS",
    }));
    return Response.json({ demo: false, available: true, items });
  } catch (e) {
    if (e instanceof OneClickError && e.status === 403)
      return Response.json({ demo: false, available: false, reason: "invite-only", items: [] });
    return Response.json({ demo: false, available: false, reason: "error", items: [] });
  }
}
