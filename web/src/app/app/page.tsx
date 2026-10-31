import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Lumen — account" };

// Placeholder until the account (passkey sign-in, balances) lands. Says so plainly rather than faking a login.
export default function AppHome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo size={28} />
      <h1 className="max-w-[520px] text-[clamp(28px,4vw,40px)] font-normal leading-tight tracking-[-0.03em]">
        The account is <i>being built</i>.
      </h1>
      <p className="max-w-[440px] text-ink-60">
        Passkey sign-in, private balances, sends and investing are in progress for the NEAR Hackathon.
      </p>
      <Link href="/" className="border border-ink px-6 py-3 font-medium transition-opacity hover:opacity-70">
        Back to home
      </Link>
    </main>
  );
}
