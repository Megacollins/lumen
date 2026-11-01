import { InvestList } from "@/components/app/invest-list";

export const metadata = { title: "Lumen — invest" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function InvestPage() {
  return <InvestList />;
}
