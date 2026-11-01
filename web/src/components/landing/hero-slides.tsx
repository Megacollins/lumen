"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";

/** The studio series, "lit from within": money, privacy, clarity. */
const SLIDES = [
  { src: "/images/gold-bar.jpg", pos: "50% 50%", alt: "A gold bar resting on a stone plinth, lit by a single warm light" },
  { src: "/images/case.jpg", pos: "50% 55%", alt: "A closed dark box with warm golden light glowing from the seam of its lid" },
  { src: "/images/glass-wide.jpg", pos: "50% 50%", alt: "A frosted glass block with a line of warm golden light glowing inside it" },
];

const noop = () => () => {};
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canTilt = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion();

/**
 * Hero photo series: crossfades every 6s, timed by the active progress bar (globals.css .hero-progress), so pausing
 * on hover or focus freezes the bar and resumes where it left off. No autoplay with reduced motion.
 * On devices with a mouse, the photo tilts a few degrees toward the pointer.
 */
export function HeroSlides({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const tilt = useRef<HTMLDivElement>(null);
  // The progress bar (which advances the slides) only starts once React is listening: started from the server HTML,
  // it could finish before hydration on a slow phone and the slideshow would never move.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const paused = hovered || reduced;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = tilt.current;
    if (!el || e.pointerType !== "mouse" || !canTilt()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
    el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function onLeave() {
    setHovered(false);
    if (tilt.current) tilt.current.style.transform = "";
  }

  return (
    <div className={className}>
      <div
        className="relative h-[300px] overflow-hidden bg-studio [perspective:1200px] sm:h-auto sm:aspect-[1672/941]"
        onPointerEnter={() => setHovered(true)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        role="group"
        aria-roledescription="carousel"
        aria-label="Lumen studio photographs"
      >
        <div ref={tilt} className="hero-tilt absolute inset-0 scale-[1.05]">
          {SLIDES.map((s, i) => (
            <Image
              key={s.src}
              src={s.src}
              alt={s.alt}
              aria-hidden={i !== index}
              fill
              priority={i === 0}
              sizes="(min-width: 1212px) 1180px, 100vw"
              style={{ objectPosition: s.pos }}
              className={`object-cover transition-opacity duration-[1100ms] ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <span aria-hidden className="hero-glint absolute inset-0" />
        </div>
        <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2 sm:bottom-5 sm:left-6" onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photograph ${i + 1} of ${SLIDES.length}`}
              aria-current={i === index}
              className="flex h-6 w-10 items-center sm:w-14"
            >
              <span className="relative block h-[2px] w-full overflow-hidden bg-ink/25">
                {i === index &&
                  hydrated &&
                  (reduced ? (
                    <span className="absolute inset-0 bg-ink" />
                  ) : (
                    <span
                      key={index}
                      className={`hero-progress absolute inset-y-0 left-0 bg-ink ${paused ? "hero-progress-paused" : ""}`}
                      onAnimationEnd={() => setIndex((n) => (n + 1) % SLIDES.length)}
                    />
                  ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
