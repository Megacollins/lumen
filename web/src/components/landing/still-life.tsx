/** Hero still life: a small gold bar engraved "LUMEN" on a stone plinth, lit by one warm light. Placeholder for the rendered photo series. */
export function StillLife({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="A small gold bar engraved Lumen resting on a stone plinth, lit by a single warm light">
      <defs>
        <radialGradient id="sl-glow" cx="50%" cy="46%" r="42%">
          <stop offset="0%" stopColor="#F3E3B4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ECEBE8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sl-front" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B8933F" />
          <stop offset="55%" stopColor="#D9B866" />
          <stop offset="100%" stopColor="#A7832F" />
        </linearGradient>
        <linearGradient id="sl-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1DC9C" />
          <stop offset="100%" stopColor="#DDBE6E" />
        </linearGradient>
        <linearGradient id="sl-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4E2DD" />
          <stop offset="100%" stopColor="#D3D0C9" />
        </linearGradient>
      </defs>
      <ellipse cx="600" cy="300" rx="420" ry="300" fill="url(#sl-glow)" />
      <ellipse cx="600" cy="560" rx="270" ry="26" fill="#141413" opacity="0.08" />
      <polygon points="400,410 800,410 840,450 440,450" fill="#EEECE7" />
      <rect x="440" y="450" width="400" height="110" fill="url(#sl-stone)" />
      <polygon points="400,410 440,450 440,560 400,520" fill="#C9C6BE" />
      <polygon points="492,352 732,352 764,384 524,384" fill="url(#sl-top)" />
      <rect x="524" y="384" width="240" height="46" fill="url(#sl-front)" />
      <polygon points="492,352 524,384 524,430 492,398" fill="#9E7C2C" />
      <text x="628" y="373" textAnchor="middle" fontSize="13" letterSpacing="6" fill="#8E6F24" transform="skewX(-38) translate(286 0)">
        LUMEN
      </text>
      <rect x="524" y="429" width="240" height="1.5" fill="#FFF3CF" opacity="0.9" />
    </svg>
  );
}
