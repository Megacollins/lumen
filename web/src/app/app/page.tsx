import { Overview } from "@/components/app/overview";

export const metadata = { title: "Lumen — overview" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function OverviewPage() {
  return <Overview />;
}
