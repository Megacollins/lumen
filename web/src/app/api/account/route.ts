import { oneclick } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";

export type Balance = { tokenId: string; available: string; source: "private" };

// The signed-in account and its confidential balances, read straight from NEAR Intents.
export async function GET() {
  const s = await getSession().catch(() => null);
  if (!s) return Response.json({ signedIn: false });

  try {
    const { balances } = await oneclick<{ balances: Balance[] }>("/v0/account/balances", { userToken: s.accessToken });
    return Response.json({ signedIn: true, signerId: s.signerId, balances, balancesAvailable: true });
  } catch {
    return Response.json({ signedIn: true, signerId: s.signerId, balances: [], balancesAvailable: false });
  }
}
