import type { SVGProps } from "react";

// Lumen's own line icons: 24px grid, 1.5 stroke, square ends. Utility icons come from lucide-react.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "square" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const AddIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="8" width="16" height="13" />
    <path d="M12 2V13M8.5 9.5L12 13l3.5-3.5" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12H19M14 7l5 5-5 5M21 5V19" />
  </svg>
);

export const InvestIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 19l6-6 4 3 8-9M16 7H21V12" />
  </svg>
);

export const PrivateIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M13 6V18" stroke="var(--gold)" strokeWidth={1.8} />
  </svg>
);

export const RevealIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12C5 6 19 6 22 12 19 18 5 18 2 12Z" />
    <rect x="10" y="10" width="4" height="4" />
  </svg>
);

export const StatementIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="18" />
    <path d="M8 8H16M8 12H16M8 16H12" />
  </svg>
);

export const PasskeyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10" width="14" height="11" />
    <path d="M8 10V6c0-2 1.5-3 4-3s4 1 4 3v4" />
  </svg>
);

export const GoldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="9" width="16" height="6" />
    <path d="M6 9l3-4h6l3 4" />
  </svg>
);

export const SwapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7H17M13 3l4 4-4 4M21 17H7M11 13l-4 4 4 4" />
  </svg>
);
