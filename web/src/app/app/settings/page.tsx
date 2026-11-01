import { Settings } from "@/components/app/settings";

export const metadata = { title: "Lumen — settings" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default function SettingsPage() {
  return <Settings />;
}
