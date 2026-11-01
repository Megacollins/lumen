import { getMarketRows, MIN_ORDER_USD } from "@/lib/markets";

export async function GET() {
  const { rows, live } = await getMarketRows();
  return Response.json({ rows, live, minOrderUsd: MIN_ORDER_USD });
}
