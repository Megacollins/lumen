import { StrategyDetail } from "@/components/app/strategies/strategy-detail";

export const metadata = { title: "Lumen — strategy" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default async function StrategyPage({ params }: PageProps<"/app/invest/strategies/[id]">) {
  const { id } = await params;
  return <StrategyDetail id={id} />;
}
