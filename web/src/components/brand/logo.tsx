type MarkProps = { size?: number; inverted?: boolean; className?: string };

/** The Lumen mark: a closed square with one line of light along its seam. */
export function Mark({ size = 22, inverted = false, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="20" height="20" fill={inverted ? "#FFFFFF" : "var(--ink)"} />
      <rect x="13.2" y="5" width="1.8" height="14" fill={inverted ? "var(--gold)" : "var(--gold-light)"} />
    </svg>
  );
}

export function Logo({ size = 22, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} inverted={inverted} />
      <span
        className={inverted ? "text-white" : "text-ink"}
        style={{ fontSize: size * 0.95, fontWeight: 500, letterSpacing: "-0.045em", lineHeight: 1 }}
      >
        lumen
      </span>
    </span>
  );
}
