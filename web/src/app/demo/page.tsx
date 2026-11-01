"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mark } from "@/components/brand/logo";

// Shareable entry point for judges: starts a demo session and opens the app.
export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/demo", { method: "POST" }).then(() => router.replace("/app"));
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <Mark size={32} className="animate-pulse" />
      <p className="text-sm text-ink-60">Opening the demo…</p>
    </main>
  );
}
