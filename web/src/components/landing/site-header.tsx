"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex h-[72px] items-center justify-between px-4 backdrop-blur-[6px] transition-[border-color,background-color] duration-200 sm:px-8 ${
        scrolled ? "border-b border-hairline bg-mist/80" : "border-b border-transparent bg-mist/40"
      }`}
    >
      <Link href="/" aria-label="Lumen home">
        <Logo size={22} />
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <a href="#how" className="hidden hover:opacity-70 md:inline">How it works</a>
        <a href="#invest" className="hidden hover:opacity-70 md:inline">Invest</a>
        <a href="#privacy" className="hidden hover:opacity-70 md:inline">Privacy</a>
        <Link href="/app" className="bg-ink px-4 py-2.5 font-medium text-white transition-opacity duration-200 hover:opacity-70">
          Open Lumen
        </Link>
      </nav>
    </header>
  );
}
