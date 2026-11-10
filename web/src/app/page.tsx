import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { MarketGrid, MarketGridFallback } from "@/components/landing/market-grid";
import { SiteHeader } from "@/components/landing/site-header";
import { AccountPreview } from "@/components/landing/account-preview";
import { HeroSlides } from "@/components/landing/hero-slides";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo, Mark } from "@/components/brand/logo";
import { PrivateIcon, StatementIcon, PasskeyIcon } from "@/components/brand/icons";
import { StepAdd, StepInvest, StepSend } from "@/components/landing/illustrations";
import { LumenBox } from "@/components/landing/lumen-box";
import { Faq } from "@/components/landing/faq";
import { CANDIDATE_ASSETS } from "@/lib/markets";
import { IntelligencePreview, IntelligencePreviewFallback, StrategiesPreview } from "@/components/landing/features";

const H2 = "text-[clamp(30px,2.4vw_+_12px,44px)] font-normal leading-[1.1] tracking-[-0.03em]";
const BODY = "text-[16px] leading-relaxed text-ink-70 md:text-[17px]";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero: studio photo series, then the statement beside an account preview (stacked below lg) */}
        <section className="relative overflow-hidden bg-studio px-4 pb-[clamp(48px,5vw,80px)] pt-6">
          <div className="relative mx-auto max-w-[1180px]">
            <HeroSlides />
            <div className="relative z-10 mt-4 flex flex-col items-center gap-12 sm:mt-0 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:pr-[3%]">
              <Reveal delay={0.2} className="sm:-mt-12 sm:self-end lg:order-last lg:self-auto">
                <AccountPreview />
              </Reveal>
              <Reveal className="max-w-[640px] text-center lg:pb-2 lg:pt-12 lg:text-left">
                <h1 className="text-[clamp(38px,5vw,64px)] font-normal leading-[1.05] tracking-[-0.04em]">
                  Private money. Private <i>markets</i>.
                </h1>
                <p className="mt-6 text-[16px] leading-relaxed text-ink-70 md:text-[18px]">
                  A self-custodial account on NEAR for your dollars and your investments. Hold USDC, pay people and buy tokenized stocks and
                  ETFs, with balances and payments kept off the public ledger.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <ButtonLink href="/app">Open your account</ButtonLink>
                  <ButtonLink href="/demo" variant="secondary">
                    Try the demo
                  </ButtonLink>
                </div>
                <p className="mt-6 max-w-[560px] text-[13px] leading-relaxed text-ink-45 max-lg:mx-auto md:text-[14px]">
                  Early preview on NEAR mainnet. Balances, prices and quotes are real; payments and orders switch on one by one after each
                  passes a live test. The demo needs no sign-up.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="relative overflow-hidden bg-paper px-4 py-[clamp(48px,5vw,80px)] text-center">
          <div
            aria-hidden
            className="absolute left-1/2 top-[38%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(233,217,168,0.5) 0%, rgba(233,217,168,0) 65%)" }}
          />
          <Reveal className="relative mx-auto max-w-[860px]">
            <p className="text-[12px] tracking-[0.12em] text-ink-45">THE PROBLEM</p>
            <p className="mt-5 text-[clamp(22px,1.6vw_+_10px,32px)] leading-[1.4] tracking-[-0.02em]">
              On a public blockchain, every payment is permanent and searchable. Anyone who learns your address can see what you earn, what
              you hold and every trade you make. Lumen keeps the self-custody of crypto and takes your finances off the <i>public record</i>
              .
            </p>
          </Reveal>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-mist px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Reveal>
              <h2 className={`${H2} text-center`}>
                Three steps. <i>Nothing</i> on display.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { Art: StepAdd, title: "Add", text: "Bring USDC from NEAR, Base, Ethereum, Arbitrum or Solana into your private balance." },
                {
                  Art: StepSend,
                  title: "Send",
                  text: "Pay any NEAR Intents account. The amount and recipient stay off the public ledger.",
                },
                {
                  Art: StepInvest,
                  title: "Invest",
                  text: "Buy tokenized stocks and ETFs, including gold and silver, from the same balance.",
                },
              ].map(({ Art, title, text }, i) => (
                <Reveal key={title} delay={i * 0.06}>
                  <div className="flex h-full flex-col items-center gap-3 border border-hairline bg-paper px-8 pb-10 pt-12 text-center">
                    <Art />
                    <h3 className="mt-4 text-[21px] font-normal tracking-[-0.02em] md:text-[24px]">{title}</h3>
                    <p className="max-w-[280px] text-[14px] leading-relaxed text-ink-60 md:text-[15px]">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div style={{ background: "linear-gradient(var(--mist) 0%, var(--stone) 50%, var(--mist) 100%)" }}>
          {/* Private Cash */}
          <section className="px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-10 lg:gap-16">
              <Reveal className="min-w-0 flex-[1_1_380px]">
                <p className="text-[12px] tracking-[0.12em] text-ink-45">PRIVATE CASH</p>
                <h2 className={`${H2} mt-4`}>
                  Money that stays <i>yours</i>.
                </h2>
                <p className={`${BODY} mt-5 max-w-[460px]`}>
                  Your dollars sit in a confidential USDC balance. Payments to other NEAR Intents accounts settle there, so amounts and
                  recipients never appear on a public block explorer. Money coming in or going out is still visible on its own chain.
                </p>
              </Reveal>
              <Reveal className="min-w-0 flex-[1_1_420px]" delay={0.1}>
                <div className="mx-auto max-w-[420px] border border-hairline bg-paper p-6">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-studio text-sm">
                      0x
                    </span>
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
          <section id="invest" className="scroll-mt-20 px-4 pb-[clamp(48px,5vw,80px)] pt-0 sm:px-8">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-10 lg:gap-16">
              <Reveal className="min-w-0 flex-[1_1_320px]">
                <p className="text-[12px] tracking-[0.12em] text-ink-45">CONFIDENTIAL INVESTMENTS</p>
                <h2 className={`${H2} mt-4`}>
                  Wall Street, <i>discreetly</i>.
                </h2>
                <p className={`${BODY} mt-5 max-w-[380px]`}>
                  Tokenized US stocks and ETFs from Ondo Global Markets, bought from your private cash through NEAR Intents. Each token
                  tracks its underlying asset and gives economic exposure only: no voting rights, and no direct ownership of shares or gold.
                </p>
                {/* The certificate's lettering is HTML over the photo (crisp, and only true statements: no company or share count) */}
                <div className="@container relative mt-10 w-full max-w-[380px]">
                  <Image
                    src="/images/certificate.jpg"
                    alt={`A certificate under a pane of glass, engraved "lumen" and "Tokenized by Ondo Global Markets, via NEAR Intents"`}
                    width={1448}
                    height={1086}
                    sizes="(min-width: 768px) 380px, 100vw"
                    className="h-auto w-full"
                  />
                  <div
                    aria-hidden
                    className="absolute left-[17%] right-[17%] top-[28%] bottom-[30%] flex flex-col items-center justify-center text-center text-[#8a6f2e] opacity-75 mix-blend-multiply"
                  >
                    <span className="text-[3cqw] uppercase tracking-[0.3em]">{CANDIDATE_ASSETS.length} tokenized assets</span>
                    <span className="mt-[2cqw] text-[11cqw] leading-none tracking-[-0.04em]">lumen</span>
                    <span className="mt-[2.5cqw] h-px w-[30cqw] bg-current opacity-60" />
                    <span className="mt-[2.5cqw] whitespace-nowrap text-[3.2cqw] leading-[1.5] tracking-[0.04em]">
                      Tokenized by Ondo Global Markets
                      <br />
                      via NEAR Intents
                    </span>
                  </div>
                </div>
              </Reveal>
              <div className="min-w-0 flex-[2_1_560px]">
                <Suspense fallback={<MarketGridFallback />}>
                  <MarketGrid />
                </Suspense>
              </div>
            </div>
          </section>
        </div>

        {/* Strategies and Intelligence (Invest → Strategies, Invest → Intelligence) */}
        <section id="strategies" className="scroll-mt-20 bg-paper px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Reveal className="mx-auto max-w-[760px] text-center">
              <p className="text-[12px] tracking-[0.12em] text-ink-45">STRATEGIES AND INTELLIGENCE</p>
              <h2 className={`${H2} mt-4`}>
                Invest together. Research <i>with sources</i>.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
              <Reveal className="flex flex-col">
                <h3 className="text-[21px] font-normal tracking-[-0.02em] md:text-[24px]">Lumen Strategies</h3>
                <p className={`${BODY} mt-3 max-w-[520px]`}>
                  Browse model allocations that other Lumen investors publish across stocks, ETFs and gold. Each one&apos;s track record
                  starts the day it&apos;s published, priced from NEAR Intents. Follow a strategy to get its updates, or copy its
                  allocation: every buy is still yours to review and sign. Publish your own and choose what you share.
                </p>
                <div className="mt-6 flex-1">
                  <StrategiesPreview />
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <ButtonLink href="/app/invest/strategies">Explore strategies</ButtonLink>
                </div>
              </Reveal>
              <Reveal className="flex flex-col" delay={0.1}>
                <h3 className="text-[21px] font-normal tracking-[-0.02em] md:text-[24px]">Lumen Intelligence</h3>
                <p className={`${BODY} mt-3 max-w-[520px]`}>
                  Real price moves, headlines and SEC filings for every Lumen asset, each with its source and time. Analyse your own
                  allocation in your browser and set alerts for the moves you care about. A private AI assistant, running on NEAR AI&apos;s
                  attested hardware, is coming next.
                </p>
                <div className="mt-6 flex-1">
                  <Suspense fallback={<IntelligencePreviewFallback />}>
                    <IntelligencePreview />
                  </Suspense>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <ButtonLink href="/app/invest/intelligence">Open Intelligence</ButtonLink>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Unified portfolio */}
        <section className="bg-mist px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto max-w-[1080px]">
            <Reveal>
              <h2 className={`${H2} text-center`}>
                One account. The <i>whole</i> picture.
              </h2>
              <p className="mx-auto mt-5 max-w-[560px] text-center text-[16px] leading-relaxed text-ink-60 md:text-[17px]">
                Cash and investments in one place, valued at current prices. You pay from the same balance you invest from.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-10 border border-hairline bg-paper p-6 sm:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-[13px] text-ink-60">Net worth</div>
                    <div className="tabular mt-1 text-[44px] leading-none tracking-[-0.04em]">$12,480.20</div>
                  </div>
                  <span className="border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Example</span>
                </div>
                <div className="mt-8 flex h-2 w-full" aria-hidden>
                  <span className="bg-ink" style={{ width: "33.7%" }} />
                  <span className="bg-gold" style={{ width: "66.3%" }} />
                </div>
                <div className="mt-8 grid gap-8 text-sm md:grid-cols-2">
                  {[
                    { title: "Cash", dot: "bg-ink", rows: [["USDC", "Private balance", "$4,210.00"]] },
                    {
                      title: "Investments",
                      dot: "bg-gold",
                      rows: [
                        ["NVIDIA", "NVDA · stock", "$3,120.40"],
                        ["SPDR Gold Shares", "GLD · gold ETF", "$5,149.80"],
                      ],
                    },
                  ].map((g) => (
                    <div key={g.title}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-45">
                        <span className={`h-1.5 w-1.5 ${g.dot}`} />
                        {g.title}
                      </div>
                      {g.rows.map(([name, sub, value]) => (
                        <div key={name} className="mt-2 flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
                          <span>
                            {name}
                            <span className="block text-xs text-ink-45">{sub}</span>
                          </span>
                          <span className="tabular">{value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-hairline pt-4 text-sm">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-ink-45">Recent</div>
                  {[
                    ["Received from 0x7c1e…a42f", "Private payment", "+$250.00"],
                    ["Bought NVIDIA", "NVDA · settled confidentially", "−$3,120.40"],
                  ].map(([title, sub, amount], i) => (
                    <div
                      key={title}
                      className={`mt-2 flex items-baseline justify-between gap-4 pt-3 ${i ? "border-t border-hairline" : ""}`}
                    >
                      <span>
                        {title}
                        <span className="block text-xs text-ink-45">{sub}</span>
                      </span>
                      <span className={`tabular ${amount.startsWith("+") ? "text-up" : ""}`}>{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Honest privacy */}
        <section id="privacy" className="scroll-mt-20 bg-paper px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto flex max-w-[1280px] flex-wrap gap-10 lg:gap-16">
            <Reveal className="min-w-0 flex-[1_1_360px]">
              <LumenBox className="mb-10 w-full max-w-[420px]" />
              <h2 className={`${H2}`}>
                Private, not <i>hidden</i>.
              </h2>
              <p className={`${BODY} mt-5 max-w-[420px]`}>
                Privacy you can explain to your accountant. Here is exactly what stays confidential, what is still public, and who else sees
                your details.
              </p>
              <ul className="mt-8 flex flex-col gap-4 text-[14px] leading-relaxed text-ink-70 md:text-[15px]">
                <li className="flex gap-3">
                  <PasskeyIcon size={20} className="mt-0.5 flex-none" />
                  <span>
                    <b className="font-medium text-ink">Self-custodial.</b> Your account is controlled by a passkey on your device. Lumen
                    never sees its private key, and never holds your funds.
                  </span>
                </li>
                <li className="flex gap-3">
                  <PrivateIcon size={20} className="mt-0.5 flex-none" />
                  <span>
                    <b className="font-medium text-ink">Confidential Intents.</b> Balances and transfers are kept on a private NEAR shard,
                    run by permissioned validators on trusted hardware (TEE).
                  </span>
                </li>
                <li className="flex gap-3">
                  <StatementIcon size={20} className="mt-0.5 flex-none" />
                  <span>
                    <b className="font-medium text-ink">Signed statements.</b> Export your balances as a file signed with your passkey, for
                    an accountant or a tax filing.
                  </span>
                </li>
              </ul>
            </Reveal>
            <Reveal className="min-w-0 flex-[1.3_1_480px]" delay={0.1}>
              <div className="border border-hairline">
                {[
                  {
                    group: "Confidential on NEAR",
                    rows: [
                      ["Your balances and holdings", "Not visible on any public block explorer."],
                      ["Payments to other NEAR Intents accounts", "Amount and recipient aren't published."],
                    ],
                  },
                  {
                    group: "Public on-chain",
                    rows: [
                      [
                        "Money in and money out",
                        "Deposits and withdrawals are visible on the chain they use. They aren't directly tied to your balance, but matching amounts and timing can reveal the link.",
                      ],
                    ],
                  },
                  {
                    group: "Seen by services",
                    rows: [
                      [
                        "Lumen's server",
                        "Reads your balances to show them to you, and sees the asset, amount and recipient of every quote.",
                      ],
                      ["NEAR Intents", "Processes every quote and transfer, and runs the confidential shard."],
                    ],
                  },
                  {
                    group: "On your screen only",
                    rows: [["Blurred balances", "Hides numbers from someone looking over your shoulder. It is not encryption."]],
                  },
                ].map(({ group, rows }) => (
                  <div key={group} className="border-b border-hairline last:border-b-0">
                    <div className="flex items-center gap-2 bg-mist px-5 py-2.5 text-[11px] uppercase tracking-[0.08em] text-ink-60">
                      <span
                        className={`h-1.5 w-1.5 ${
                          group === "Confidential on NEAR" ? "bg-gold" : group === "Public on-chain" ? "bg-ink" : "border border-ink-45"
                        }`}
                      />
                      {group}
                    </div>
                    {rows.map(([what, detail]) => (
                      <div key={what} className="border-t border-hairline px-5 py-4">
                        <div>{what}</div>
                        <div className="mt-1 text-sm leading-relaxed text-ink-60">{detail}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-45">
                Confidential Intents relies on trusted hardware and NEAR&apos;s permissioned validators. It is not zero-knowledge
                cryptography. In this preview, Lumen reads real balances and quotes; confidential payments and orders switch on after each
                passes a live test on mainnet.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Who it's for */}
        <section className="bg-mist px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Reveal>
              <h2 className={`${H2} mx-auto max-w-[900px] text-center`}>
                For people who would <i>rather not</i> be watched
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                ["Freelancers paid in stablecoins", "Get paid in USDC without publishing your income to the world."],
                ["Savers in high-inflation economies", "Hold dollars and a gold ETF without broadcasting what you have."],
                ["Founders and small teams", "Pay contractors and suppliers without exposing your runway."],
                ["Investors", "Build positions without your wallet being tracked or copy-traded."],
                [
                  "Investors who want to share",
                  "Publish a strategy others can follow, and choose what it reveals: the allocation, and only if you opt in, a holdings check.",
                ],
                [
                  "People who do their own research",
                  "Price moves, headlines and SEC filings for every asset, each with its source, plus alerts you set.",
                ],
              ].map(([title, text], i) => (
                <Reveal key={title} delay={i * 0.05}>
                  <div className="h-full border border-hairline bg-paper p-8">
                    <div className="text-[20px] tracking-[-0.015em] md:text-[22px]">{title}</div>
                    <div className="mt-2 text-[14px] leading-relaxed text-ink-60 md:text-[15px]">{text}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="scroll-mt-20 bg-paper px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-16">
            <Reveal>
              <h2 className={H2}>
                Questions, <i>answered</i>.
              </h2>
              <p className={`${BODY} mt-5 max-w-[340px]`}>The short version. The privacy section above has the full detail.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* Call to action */}
        <section
          id="open"
          className="px-4 py-[clamp(48px,5vw,88px)] text-center"
          style={{ background: "linear-gradient(var(--paper) 0%, var(--studio) 100%)" }}
        >
          <Reveal>
            <div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(240,223,174,0.85) 0%, rgba(236,235,232,0) 68%)" }}
              />
              <Mark size={60} className="relative" />
            </div>
            <h2 className={`${H2} mt-4`}>
              Your finances, finally <i>yours</i>.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-60 md:text-[17px]">
              Create a passkey on your device and you&apos;re in. No seed phrase, nothing to install.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/app">Open your account</ButtonLink>
              <ButtonLink href="/demo" variant="secondary">
                Try the demo
              </ButtonLink>
            </div>
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
            <a href="https://github.com/Megacollins/lumen" className="hover:opacity-70">
              GitHub
            </a>
            <Link href="/#privacy" className="hover:opacity-70">
              Privacy
            </Link>
            <Link href="/legal" className="hover:opacity-70">
              Terms and risks
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-[1280px] text-[13px] leading-relaxed text-ink-45">
          Tokenized stocks and ETFs are issued by Ondo Global Markets, give economic exposure only, and are not available to US persons or
          in restricted jurisdictions. Prices can fall as well as rise. Lumen does not provide investment advice and never holds your funds.
        </p>
      </footer>
    </>
  );
}
