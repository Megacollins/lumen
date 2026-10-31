import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-white border border-ink",
  secondary: "bg-transparent text-ink border border-ink",
};

/** Square button-styled link. Hover drops opacity, as in DESIGN.md. */
export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      {...props}
      className={`inline-flex h-12 items-center justify-center px-7 text-base font-medium transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-gold ${styles[variant]} ${className}`}
    />
  );
}
