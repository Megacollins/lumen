import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small building blocks for the landing page: ink pill buttons, gold chips and line icons.

type IconProps = { className?: string; size?: number };
const svg = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});

export const ArrowRight = ({ className, size = 16 }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const LockIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...svg(size, className)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
  </svg>
);
export const BarsIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M5 20v-6M10 20V10M15 20v-8M20 20V5M4 9l5-4 5 3 6-5" />
  </svg>
);
export const SparkIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" />
    <path d="M19 16.5c.2 1.3.8 1.9 2 2-1.2.2-1.8.8-2 2-.2-1.2-.8-1.8-2-2 1.2-.1 1.8-.7 2-2Z" />
  </svg>
);
export const PlayIcon = ({ className, size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <path d="M7 4.5v15l12.5-7.5L7 4.5Z" fill="currentColor" />
  </svg>
);
export const QuestionIcon = ({ className, size = 26 }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M9.2 9.2a2.9 2.9 0 1 1 4.1 2.6c-.8.4-1.3 1.1-1.3 2v.7M12 17.6v.1" />
  </svg>
);
export const XLogo = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      fill="currentColor"
      d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z"
    />
  </svg>
);
export const GitHubLogo = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
    />
  </svg>
);
export const NearLogo = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      fill="currentColor"
      d="M18.1 3.4 14.2 9.2c-.3.4.3.9.6.5l3.8-3.3c.1-.1.3 0 .3.1v10.4c0 .2-.2.2-.3.1L7.1 3.9C6.7 3.4 6.1 3 5.4 3h-.4A2 2 0 0 0 3 5v14a2 2 0 0 0 3.9.6l3.9-5.8c.3-.4-.3-.9-.6-.5l-3.8 3.3c-.1.1-.3 0-.3-.1V6.1c0-.2.2-.2.3-.1l11.5 13.1c.4.5 1 .9 1.7.9h.4a2 2 0 0 0 2-2V5a2 2 0 0 0-3.9-1.6Z"
    />
  </svg>
);

/** Deep ink pill with an arrow that nudges on hover. */
export function PillLink({ children, className = "", ...props }: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link
      {...props}
      className={`group inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-full bg-ink px-7 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${className}`}
    >
      {children}
      <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Gold chip that names a feature, e.g. "Lumen Strategies". */
export function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-[13px] font-medium text-[#3b2f14]">
      <span className="text-gold-ink">{icon}</span>
      {children}
    </span>
  );
}

export const eyebrow = "text-[13px] font-medium uppercase tracking-[0.14em] text-gold-ink";
export const serifH2 = "font-serif text-[clamp(38px,3.4vw_+_14px,58px)] font-normal leading-[1.02] tracking-[-0.01em] text-[#141413]";
export const body = "text-[16px] leading-relaxed text-ink-70 md:text-[17px]";
