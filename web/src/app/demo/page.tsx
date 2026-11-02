"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/logo";

const start = (confirm: boolean) =>
  fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });

// Shareable entry point for judges: starts a demo session and opens the app. If a real account is signed in here,
// it asks before switching, so a link can't silently sign anyone out.
export default function DemoPage() {
  const router = useRouter();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    start(false).then((r) => (r.status === 409 ? setAsk(true) : router.replace("/app")));
  }, [router]);

  if (ask)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <Mark size={32} />
        <p className="max-w-[360px] text-[15px] leading-relaxed text-ink-70">
          You&apos;re signed in to your Lumen account. Opening the demo signs you out of it on this device.
        </p>
        <div className="flex gap-2">
          <Link href="/app" className="flex h-11 items-center border border-hairline bg-paper px-5 text-sm font-medium transition-opacity hover:opacity-70">
            Back to my account
          </Link>
          <button
            type="button"
            onClick={() => start(true).then(() => router.replace("/app"))}
            className="h-11 bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-70"
          >
            Open the demo
          </button>
        </div>
      </main>
    );

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <Mark size={32} className="animate-pulse" />
      <p className="text-sm text-ink-60">Opening the demo…</p>
    </main>
  );
}
