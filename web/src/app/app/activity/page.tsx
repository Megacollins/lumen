import { Activity } from "@/components/app/activity";

export const metadata = { title: "Lumen — activity" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function ActivityPage() {
  return <Activity />;
}
