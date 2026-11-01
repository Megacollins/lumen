import { AccountGate } from "@/components/app/account-app";

// Everything under /app waits for the user's session (read client-side), so it can't prerender instantly.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <main className="flex flex-1 flex-col">
      <AccountGate>{children}</AccountGate>
    </main>
  );
}
