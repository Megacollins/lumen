import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Lumen — terms and risks" };

export default function Legal() {
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-20">
      <Link href="/" aria-label="Lumen home">
        <Logo size={22} />
      </Link>
      <h1 className="mt-12 text-[40px] font-normal tracking-[-0.03em]">Terms and risks</h1>
      <div className="mt-8 flex flex-col gap-6 leading-relaxed text-ink-70">
        <p>
          <b>Hackathon software.</b> Lumen is an experimental project built for the NEAR Hackathon (November 2026). Use
          only small amounts you can afford to lose.
        </p>
        <p>
          <b>Non-custodial.</b> You sign every transaction with your own key. Lumen never holds your keys or funds and
          cannot recover them.
        </p>
        <p>
          <b>Privacy model.</b> Lumen uses NEAR Confidential Intents, which processes transactions on a private NEAR
          shard run by permissioned validators and secured by trusted hardware (TEE). It is not zero-knowledge.
          Deposits and withdrawals remain visible on their own chains. Lumen&apos;s server and the NEAR Intents API see
          order details when quoting.
        </p>
        <p>
          <b>Tokenized assets.</b> Stock, fund and gold tokens are issued by Ondo Global Markets. They give economic
          exposure to the underlying asset and are not direct ownership of shares or physical gold. They are not
          available to US persons, and may require professional-investor status in some jurisdictions. Prices can fall
          as well as rise.
        </p>
        <p>
          <b>No advice.</b> Nothing in Lumen is investment, tax or legal advice.
        </p>
      </div>
    </main>
  );
}
