"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Markets | Strategies switch at the top of Invest. */
export function InvestTabs() {
  const path = usePathname();
  const strategies = path.startsWith("/app/invest/strategies");
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-1 pb-2.5 text-[15px] transition-opacity hover:opacity-70 ${
        active ? "border-ink text-ink" : "border-transparent text-ink-45"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex gap-6 border-b border-hairline pt-6 md:pt-8" aria-label="Invest">
      {tab("/app/invest", "Markets", !strategies)}
      {tab("/app/invest/strategies", "Strategies", strategies)}
    </nav>
  );
}
