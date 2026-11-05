import { StrategyList } from "@/components/app/strategies/strategy-list";

export const metadata = { title: "Lumen — strategies" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function StrategiesPage() {
  return <StrategyList />;
}
