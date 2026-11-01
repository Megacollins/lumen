import { Cash } from "@/components/app/cash";

export const metadata = { title: "Lumen — cash" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function CashPage() {
  return <Cash />;
}
