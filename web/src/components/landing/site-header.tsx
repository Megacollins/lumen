"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ArrowRight } from "@/components/landing/ui";

const LINKS = [
  ["Invest", "#invest"],
  ["Strategies", "#strategies"],
  ["Intelligence", "#intelligence"],
  ["About", "#about"],
] as const;

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
      className={`sticky top-0 z-50 backdrop-blur-[8px] transition-[border-color,background-color] duration-200 ${
        scrolled ? "border-b border-sand bg-ivory/85" : "border-b border-transparent bg-ivory/40"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="Lumen home">
          <Logo size={22} />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-9 text-[15px] text-[#141413] md:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="relative py-1 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {label}
            </a>
          ))}
        </nav>
        <Link
          href="/app"
          className="group inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-ink-soft"
        >
          Launch App
          <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
