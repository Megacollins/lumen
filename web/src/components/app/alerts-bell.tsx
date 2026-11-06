"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Header bell: unread Smart Alerts, linking to them. Real accounts only (alerts are stored per account). */
export function AlertsBell() {
  const path = usePathname();
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/intelligence/alerts?count=1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { unseen: 0 }))
        .then((d) => alive && setUnseen(d.unseen ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [path]);

  return (
    <Link
      href="/app/invest/intelligence#alerts"
      aria-label={unseen ? `${unseen} unread alerts` : "Alerts"}
      className="relative flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-70"
    >
      <Bell size={19} strokeWidth={1.5} aria-hidden />
      {unseen > 0 && (
        <span className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] leading-none text-ink">
          {unseen > 9 ? "9+" : unseen}
        </span>
      )}
    </Link>
  );
}
