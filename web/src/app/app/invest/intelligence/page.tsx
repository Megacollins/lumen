import { Intelligence } from "@/components/app/intelligence/intelligence";

export const metadata = { title: "Lumen — intelligence" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function IntelligencePage() {
  return <Intelligence />;
}
