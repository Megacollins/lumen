import { oneclick } from "@/lib/server/oneclick";
import { getSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

export type Balance = { tokenId: string; available: string; source: "private" };

// The signed-in account and its confidential balances, read straight from NEAR Intents.
export async function GET(req: Request) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;
  const s = await getSession().catch(() => null);
  if (!s) return Response.json({ signedIn: false });
  if (s.demo) return Response.json({ signedIn: true, demo: true, signerId: s.signerId, balances: [], balancesAvailable: true });

  try {
    const { balances } = await oneclick<{ balances: Balance[] }>("/v0/account/balances", { userToken: s.accessToken });
    return Response.json({ signedIn: true, signerId: s.signerId, standard: s.standard, balances, balancesAvailable: true });
  } catch {
    return Response.json({ signedIn: true, signerId: s.signerId, standard: s.standard, balances: [], balancesAvailable: false });
  }
}
