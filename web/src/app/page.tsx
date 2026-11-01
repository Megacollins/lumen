import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { MarketGrid, MarketGridFallback } from "@/components/landing/market-grid";
import { SiteHeader } from "@/components/landing/site-header";
import { AccountPreview } from "@/components/landing/account-preview";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "@/components/brand/logo";
import { PrivateIcon, StatementIcon, PasskeyIcon } from "@/components/brand/icons";
import { StepAdd, StepInvest, StepSend } from "@/components/landing/illustrations";

const H2 = "text-[clamp(32px,4.2vw,60px)] font-normal leading-[1.08] tracking-[-0.035em]";
const BODY = "text-base leading-relaxed text-ink-70";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero: still life with an account preview */}
        <section className="relative overflow-hidden bg-studio px-4 pb-16 pt-6 sm:pb-24">
          <div className="relative mx-auto max-w-[1180px]">
            <Image
              src="/images/gold-bar.jpg"
              alt="A gold bar resting on a stone plinth, lit by a single warm light"
              width={1672}
              height={941}
              priority
              sizes="(min-width: 1212px) 1180px, 100vw"
              className="block h-[300px] w-full object-cover sm:h-auto"
            />
            <div className="mx-auto -mt-6 flex justify-center sm:absolute sm:bottom-[8%] sm:right-[2%] sm:mt-0">
              <Reveal delay={0.2}>
                <AccountPreview />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Statement */}
        <section className="bg-paper px-4 py-[clamp(96px,12vw,180px)] text-center">
          <Reveal className="mx-auto max-w-[980px]">
            <h1 className="text-[clamp(38px,5.2vw,68px)] font-normal leading-[1.05] tracking-[-0.04em]">
              Private money. Private <i>markets</i>.
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-lg leading-relaxed text-ink-70">
              Lumen is a confidential account on NEAR. Hold dollars, send money privately, and invest in tokenized
              stocks and gold, with balances the public can&apos;t see.
            </p>
            <p className="mt-3 text-[15px] italic text-ink-60">Your money. Your investments. Your privacy.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/app">Open Lumen</ButtonLink>
              <ButtonLink href="/demo" variant="secondary">
                Try the demo
              </ButtonLink>
            </div>
          </Reveal>
        </section>

        {/* The problem */}
        <section className="relative overflow-hidden bg-paper px-4 pb-[clamp(96px,10vw,160px)] text-center">
          <div
            aria-hidden
            className="absolute left-1/2 top-[38%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(233,217,168,0.5) 0%, rgba(233,217,168,0) 65%)" }}
          />
          <Reveal className="relative mx-auto max-w-[860px]">
            <p className="text-[13px] tracking-[0.12em] text-ink-45">THE PROBLEM</p>
            <p className="mt-5 text-[clamp(24px,3vw,36px)] leading-[1.35] tracking-[-0.02em]">
              On a public blockchain, every payment becomes a public record: your salary, your savings, your trades.
              Lumen keeps what&apos;s good about crypto and gives back the <i>privacy</i> a bank account always had.
            </p>
          </Reveal>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-mist px-4 py-[clamp(96px,10vw,160px)] sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Reveal>
              <h2 className={`${H2} text-center`}>
                Three steps. <i>Nothing</i> on display.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                { Art: StepAdd, title: "Add", text: "Move USDC from any chain into your private balance." },
                { Art: StepSend, title: "Send", text: "Pay another NEAR Intents account. The amount stays off the public record." },
                { Art: StepInvest, title: "Invest", text: "Buy tokenized stocks and gold from the same balance." },
              ].map(({ Art, title, text }, i) => (
                <Reveal key={title} delay={i * 0.06}>
                  <div className="flex h-full flex-col items-center gap-3 border border-hairline bg-paper px-8 pb-10 pt-12 text-center">
                    <Art />
                    <h3 className="mt-4 text-[26px] font-normal tracking-[-0.02em]">{title}</h3>
                    <p className="max-w-[280px] text-[15px] leading-relaxed text-ink-60">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div style={{ background: "linear-gradient(var(--mist) 0%, var(--stone) 50%, var(--mist) 100%)" }}>
          {/* Private Cash */}
          <section className="px-4 py-[clamp(96px,10vw,140px)] sm:px-8">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-16">
              <Reveal className="min-w-0 flex-[1_1_380px]">
                <p className="text-[13px] tracking-[0.12em] text-ink-45">PRIVATE CASH</p>
                <h2 className={`${H2} mt-4 text-[clamp(32px,3.6vw,48px)]`}>
                  Money that stays <i>yours</i>.
                </h2>
                <p className={`${BODY} mt-5 max-w-[460px]`}>
                  Hold dollars in a confidential balance and pay other accounts privately. Amounts and balances stay off the
                  public record. Deposits and withdrawals are still visible on their own chains, but not linked to
                  each other.
                </p>
              </Reveal>
              <Reveal className="min-w-0 flex-[1_1_420px]" delay={0.1}>
                <div className="mx-auto max-w-[420px] border border-hairline bg-paper p-6">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-studio text-sm">0x</span>
                    <div>
                      <div className="tabular">0x055f…679b</div>
                      <div className="text-xs text-ink-45">NEAR Intents account</div>
                    </div>
                  </div>
                  <div className="tabular mt-8 text-center text-[56px] leading-none tracking-[-0.05em]">
                    $40<span className="text-ink-45">.00</span>
                  </div>
                  <div className="mx-auto mt-5 flex w-fit items-center gap-2 border border-[#EBDDB4] bg-[#FBF5E4] px-3 py-2 text-[13px] text-[#6B5318]">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    Hidden from the public
                  </div>
                  <div className="mt-6 flex h-12 items-center justify-center bg-ink font-medium text-white">Send privately</div>
                  <p className="mt-3 text-center text-xs text-ink-45">Example screen</p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* Confidential investments */}
          <section id="invest" className="scroll-mt-20 px-4 pb-[clamp(96px,10vw,160px)] pt-10 sm:px-8">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-16">
              <Reveal className="min-w-0 flex-[1_1_320px]">
                <p className="text-[13px] tracking-[0.12em] text-ink-45">CONFIDENTIAL INVESTMENTS</p>
                <h2 className={`${H2} mt-4`}>
                  Wall Street, <i>discreetly</i>.
                </h2>
                <p className={`${BODY} mt-5 max-w-[380px]`}>
                  Tokenized stocks and funds from Ondo Global Markets, bought through NEAR Intents from your private
                  balance. Each token gives economic exposure to the underlying asset; it is not direct share
                  ownership.
                </p>
                <Image
                  src="/images/certificate.jpg"
                  alt="A blank certificate with an engraved border under a pane of glass"
                  width={1448}
                  height={1086}
                  sizes="(min-width: 768px) 380px, 100vw"
                  className="mt-10 h-auto w-full max-w-[380px]"
                />
              </Reveal>
              <div className="grid min-w-0 flex-[2_1_560px] gap-4 sm:grid-cols-2">
                <Suspense fallback={<MarketGridFallback />}>
                  <MarketGrid />
                </Suspense>
              </div>
            </div>
          </section>
        </div>

        {/* Unified portfolio */}
        <section className="bg-mist px-4 py-[clamp(96px,10vw,160px)] sm:px-8">
          <div className="mx-auto max-w-[1080px]">
            <Reveal>
              <h2 className={`${H2} text-center`}>
                One account. The <i>whole</i> picture.
              </h2>
              <p className="mx-auto mt-5 max-w-[560px] text-center text-[17px] text-ink-60">
                Cash and investments side by side, with every transaction and its status in one place.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-14 border border-hairline bg-paper p-6 sm:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-[13px] text-ink-60">Net worth · example</div>
                    <div className="tabular mt-1 text-[44px] leading-none tracking-[-0.04em]">$12,480.20</div>
                  </div>
                  <div className="text-sm text-up">▲ $142.10 today</div>
                </div>
                <div className="mt-8 flex h-2 w-full">
                  <span className="bg-ink" style={{ width: "34%" }} />
                  <span className="bg-stone" style={{ width: "25%" }} />
                  <span className="bg-gold" style={{ width: "41%" }} />
                </div>
                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                  {[
                    ["bg-ink", "Cash", "34%"],
                    ["bg-stone", "Stocks and funds", "25%"],
                    ["bg-gold", "Gold", "41%"],
                  ].map(([dot, label, pct]) => (
                    <div key={label} className="flex items-center justify-between border-t border-hairline pt-3">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 ${dot}`} />
                        {label}
                      </span>
                      <span className="tabular text-ink-60">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Honest privacy */}
        <section id="privacy" className="scroll-mt-20 bg-paper px-4 py-[clamp(96px,10vw,160px)] sm:px-8">
          <div className="mx-auto flex max-w-[1280px] flex-wrap gap-16">
            <Reveal className="min-w-0 flex-[1_1_360px]">
              <Image
                src="/images/case.jpg"
                alt="A closed grey box with warm golden light glowing from the seam of its lid"
                width={1536}
                height={1024}
                sizes="(min-width: 768px) 420px, 100vw"
                className="mb-10 h-auto w-full max-w-[420px]"
              />
              <h2 className={`${H2} text-[clamp(32px,3.6vw,48px)]`}>
                Private, not <i>hidden</i>.
              </h2>
              <p className={`${BODY} mt-5 max-w-[420px]`}>
                Privacy you can explain to your accountant. Here is exactly what Lumen protects, and what it
                doesn&apos;t.
              </p>
              <ul className="mt-8 flex flex-col gap-4 text-[15px] text-ink-70">
                <li className="flex gap-3"><PasskeyIcon size={20} className="mt-0.5 flex-none" /><span><b><i>Non-custodial.</i></b> You sign every action with your passkey. Lumen never holds your keys or money.</span></li>
                <li className="flex gap-3"><PrivateIcon size={20} className="mt-0.5 flex-none" /><span><b><i>Confidential Intents.</i></b> Transactions run on a private NEAR shard secured by trusted hardware (TEE).</span></li>
                <li className="flex gap-3"><StatementIcon size={20} className="mt-0.5 flex-none" /><span><b><i>Statements on demand.</i></b> Export a signed record for an accountant or a tax filing.</span></li>
              </ul>
            </Reveal>
            <Reveal className="min-w-0 flex-[1.3_1_480px]" delay={0.1}>
              <div className="border border-hairline">
                {[
                  ["Your balance and holdings", "Private", "Kept on a confidential shard, not on the public ledger."],
                  ["Payments between Lumen accounts", "Private", "Amounts and parties stay off the public record."],
                  ["Deposits in, withdrawals out", "Public", "Visible on their own chains. The link between them is hidden."],
                  ["Order details when quoting", "Seen by Lumen", "Lumen's server and the NEAR Intents API see asset, amount and recipient."],
                  ["Blurred balances in the app", "Screen only", "Protects you from someone looking over your shoulder. Not cryptography."],
                ].map(([what, level, detail]) => (
                  <div key={what} className="grid gap-1 border-b border-hairline p-5 last:border-b-0 sm:grid-cols-[1fr_120px] sm:gap-6">
                    <div>
                      <div>{what}</div>
                      <div className="mt-1 text-sm text-ink-60">{detail}</div>
                    </div>
                    <div className="flex items-start sm:justify-end">
                      <span
                        className={`px-2.5 py-1 text-xs ${
                          level === "Private" ? "bg-[#FBF5E4] text-[#6B5318]" : level === "Public" ? "bg-studio text-ink" : "border border-hairline text-ink-60"
                        }`}
                      >
                        {level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-45">
                Confidential Intents relies on trusted hardware and NEAR&apos;s permissioned validator set. It is not
                zero-knowledge cryptography.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Who it's for */}
        <section className="bg-mist px-4 py-[clamp(96px,10vw,160px)] sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Reveal>
              <h2 className={`${H2} mx-auto max-w-[900px] text-center`}>
                For people who would <i>rather not</i> be watched
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-2">
              {[
                ["Freelancers paid in stablecoins", "Get paid in USDC without publishing your income to the world."],
                ["Savers in high-inflation economies", "Hold dollars and gold without broadcasting what you have."],
                ["Founders and small teams", "Pay contractors and suppliers without exposing your runway."],
                ["Investors", "Build positions without being tracked or copy-traded."],
              ].map(([title, text], i) => (
                <Reveal key={title} delay={i * 0.05}>
                  <div className="h-full border border-hairline bg-paper p-8">
                    <div className="text-xl tracking-[-0.015em]">{title}</div>
                    <div className="mt-2 text-[15px] leading-relaxed text-ink-60">{text}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section
          id="open"
          className="px-4 py-[clamp(110px,12vw,200px)] text-center"
          style={{ background: "linear-gradient(var(--paper) 0%, var(--studio) 100%)" }}
        >
          <Reveal>
            <Image
              src="/images/glass.jpg"
              alt="A frosted glass block with a line of warm golden light glowing inside it"
              width={1254}
              height={1254}
              sizes="280px"
              className="mx-auto h-auto w-[240px] sm:w-[280px]"
            />
            <h2 className={`${H2} mt-7`}>
              Your finances, finally <i>yours</i>.
            </h2>
            <p className="mt-4 text-[17px] text-ink-60">Sign in with a passkey. No seed phrase.</p>
            <ButtonLink href="/app" className="mt-9">
              Open Lumen
            </ButtonLink>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-hairline bg-studio px-4 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 text-[13px] text-ink-60">
          <div className="flex items-center gap-3">
            <Logo size={16} />
            <span>Built on NEAR</span>
          </div>
          <nav className="flex flex-wrap gap-6">
            <a href="https://github.com/Megacollins/lumen" className="hover:opacity-70">GitHub</a>
            <Link href="/#privacy" className="hover:opacity-70">Privacy</Link>
            <Link href="/legal" className="hover:opacity-70">Terms and risks</Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-[1280px] text-xs leading-relaxed text-ink-45">
          Tokenized stocks and funds are issued by Ondo Global Markets, give economic exposure only, and are not
          available to US persons or in restricted jurisdictions. Prices can fall as well as rise. Lumen does not
          provide investment advice and never holds your funds.
        </p>
      </footer>
    </>
  );
}
