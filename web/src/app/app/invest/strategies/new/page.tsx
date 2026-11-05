import { StrategyForm } from "@/components/app/strategies/strategy-form";

export const metadata = { title: "Lumen — publish a strategy" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function NewStrategyPage() {
  return <StrategyForm />;
}
