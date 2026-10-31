import { AccountApp } from "@/components/app/account-app";

export const metadata = { title: "Lumen — your account" };

export default function AppHome() {
  return (
    <main className="flex flex-1 flex-col">
      <AccountApp />
    </main>
  );
}
