import Link from "next/link";
import { Suspense } from "react";
import { HeroSlides } from "@/components/landing/hero-slides";
import { LumenBox } from "@/components/landing/lumen-box";
import { SiteHeader } from "@/components/landing/site-header";
import { Reveal } from "@/components/motion/reveal";
import { Logo } from "@/components/brand/logo";
import { Faq } from "@/components/landing/faq";
import {
  IntelligencePanel,
  IntelligencePanelFallback,
  MarketsLaptop,
  MarketsLaptopFallback,
  StrategiesPhone,
  StrategiesPhoneFallback,
} from "@/components/landing/previews";
import {
  BarsIcon,
  body,
  Chip,
  eyebrow,
  GitHubLogo,
  LockIcon,
  NearLogo,
  PillLink,
  PlayIcon,
  QuestionIcon,
  serifH2,
  SparkIcon,
  XLogo,
} from "@/components/landing/ui";

/** The submitted demo video, posted on X for the NEAR Hackathon. */
const DEMO_POST = "https://x.com/CallMeMegaB/status/2120668701372387748";
const REPO = "https://github.com/Megacollins/lumen";

const PILLARS = [
  { Icon: LockIcon, title: "Invest Privately", text: "Balances on NEAR Confidential Intents", href: "#invest" },
  { Icon: BarsIcon, title: "Invest Together", text: "Publish and follow strategies", href: "#strategies" },
  { Icon: SparkIcon, title: "Invest Intelligently", text: "Sourced insights and alerts", href: "#intelligence" },
];

const card =
  "relative overflow-hidden rounded-[32px] border border-sand bg-gradient-to-br from-cream via-[#f6eedf] to-[#efe3cb] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_30px_60px_-40px_rgba(20,20,19,0.45)]";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-ivory">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 70% at 78% 30%, rgba(240,214,160,0.55) 0%, rgba(247,242,233,0) 70%), linear-gradient(180deg, #f9f4ea 0%, var(--ivory) 100%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-6 px-4 pb-12 pt-2 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-0 lg:pb-20 lg:pt-14">
            <Reveal className="relative z-10 text-center lg:text-left">
              <h1 className="font-serif text-[clamp(54px,7.4vw,108px)] font-normal leading-[0.94] tracking-[-0.02em] text-[#141413]">
                Private money.
                <br />
                Private markets.
              </h1>
              <p className="mx-auto mt-7 max-w-[440px] text-[18px] leading-relaxed text-[#3a3936] md:text-[20px] lg:mx-0">
                Hold dollars, pay privately and invest in stocks and gold, all on NEAR.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 lg:justify-start">
                <PillLink href="/demo">Explore Lumen</PillLink>
                <a
                  href={DEMO_POST}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 text-[15px] text-[#141413]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/70 bg-cream text-ink transition-colors duration-200 group-hover:bg-gold-soft">
                    <PlayIcon />
                  </span>
                  Watch Demo
                  <span className="sr-only">(video on X, opens in a new tab)</span>
                </a>
              </div>
              <p className="mx-auto mt-8 max-w-[460px] text-[13px] leading-relaxed text-ink-45 lg:mx-0">
                Early preview on NEAR mainnet. Balances, prices and quotes are real; payments and orders switch on one by one after each
                passes a live test. The demo needs no sign-up.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="relative mt-4 max-lg:order-first lg:mt-0 lg:-mr-10 lg:ml-6">
              <HeroSlides />
            </Reveal>
          </div>
        </section>

        {/* Three pillars */}
        <section className="border-y border-sand bg-cream/70">
          <div className="mx-auto grid max-w-[1200px] px-4 sm:px-8 md:grid-cols-3">
            {PILLARS.map(({ Icon, title, text, href }, i) => (
              <Reveal key={title} delay={i * 0.06}>
                <a
                  href={href}
                  className={`group flex items-center gap-4 py-6 md:justify-center md:px-4 ${i ? "border-t border-sand md:border-l md:border-t-0" : ""}`}
                >
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gold-soft text-gold-ink transition-transform duration-300 group-hover:scale-105">
                    <Icon />
                  </span>
                  <span>
                    <span className="block font-serif text-[24px] leading-tight text-[#141413]">{title}</span>
                    <span className="block text-[13px] text-ink-60">{text}</span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Strategies and Intelligence */}
        <section className="px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <div className="mx-auto grid max-w-[1200px] gap-6 xl:grid-cols-2">
            <Reveal className="h-full">
              <article id="strategies" className={`${card} grid h-full scroll-mt-24 items-center gap-8 p-7 sm:grid-cols-[1fr_auto] sm:p-10`}>
                <div>
                  <Chip icon={<BarsIcon size={15} />}>Lumen Strategies</Chip>
                  <h2 className={`${serifH2} mt-6`}>
                    Discover. Create.
                    <br />
                    Follow.
                  </h2>
                  <p className={`${body} mt-5 max-w-[300px]`}>
                    Follow model allocations from Lumen investors, each with a track record from the day it&apos;s published, or publish your own.
                  </p>
                  <PillLink href="/app/invest/strategies" className="mt-8">
                    Explore Strategies
                  </PillLink>
                </div>
                <div className="flex justify-center">
                  <Suspense fallback={<StrategiesPhoneFallback />}>
                    <StrategiesPhone />
                  </Suspense>
                </div>
              </article>
            </Reveal>
            <Reveal className="h-full" delay={0.1}>
              <article
                id="intelligence"
                className={`${card} grid h-full scroll-mt-24 items-center gap-8 p-7 sm:grid-cols-[1fr_auto] sm:p-10`}
              >
                <div>
                  <Chip icon={<SparkIcon size={15} />}>Lumen Intelligence</Chip>
                  <h2 className={`${serifH2} mt-6`}>
                    Research. Analyse.
                    <br />
                    Alert.
                  </h2>
                  <p className={`${body} mt-5 max-w-[300px]`}>
                    Sourced price moves, headlines and SEC filings, plus portfolio analysis and alerts. A private AI assistant is coming next.
                  </p>
                  <PillLink href="/app/invest/intelligence" className="mt-8">
                    Open Intelligence
                  </PillLink>
                </div>
                <div className="flex justify-center">
                  <Suspense fallback={<IntelligencePanelFallback />}>
                    <IntelligencePanel />
                  </Suspense>
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        {/* Confidential investments */}
        <section id="invest" className="scroll-mt-20 px-4 pb-[clamp(48px,5vw,88px)] pt-[clamp(16px,2vw,32px)] sm:px-8">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <p className={eyebrow}>Confidential investments</p>
              <h2 className={`${serifH2} mt-5`}>Invest with confidence</h2>
              <p className={`${body} mt-5 max-w-[460px]`}>
                Trade tokenized US stocks and gold and silver ETFs from Ondo Global Markets, bought from your private balance through NEAR
                Intents, where independent solvers compete to fill each order.
              </p>
              <p className="mt-4 max-w-[460px] text-[14px] leading-relaxed text-ink-60">
                Each token tracks its underlying asset and gives economic exposure only: no voting rights, and no direct ownership of shares
                or gold. Not available to US persons or in restricted jurisdictions.
              </p>
              <PillLink href="/app/invest" className="mt-8">
                Start Investing
              </PillLink>
            </Reveal>
            <Reveal delay={0.1}>
              <Suspense fallback={<MarketsLaptopFallback />}>
                <MarketsLaptop />
              </Suspense>
            </Reveal>
          </div>
        </section>

        {/* About: the problem, and exactly who sees what */}
        <section id="about" className="scroll-mt-20 border-t border-sand bg-cream/60 px-4 py-[clamp(48px,5vw,88px)] sm:px-8">
          <div id="privacy" className="mx-auto grid max-w-[1200px] scroll-mt-20 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <LumenBox className="mb-10 w-full max-w-[460px] rounded-[28px] border border-sand" />
              <p className={eyebrow}>About Lumen</p>
              <h2 className={`${serifH2} mt-5`}>Private, not hidden.</h2>
              <p className={`${body} mt-5 max-w-[460px]`}>
                On a public blockchain, every payment is permanent and searchable. Anyone who learns your address can see what you earn, what
                you hold and every trade you make. Lumen keeps the self-custody of crypto and takes your finances off the public record.
              </p>
              <ul className="mt-8 flex max-w-[460px] flex-col gap-4 text-[15px] leading-relaxed text-ink-70">
                {[
                  [
                    "Self-custodial.",
                    "A passkey on your device, or your own MetaMask or NEAR wallet, signs everything. Lumen never sees your keys or holds your funds.",
                  ],
                  [
                    "Confidential Intents.",
                    "Balances and transfers are kept on a private NEAR shard, run by permissioned validators on trusted hardware (TEE).",
                  ],
                  ["Signed statements.", "Export your balances as a file signed with your passkey, for an accountant or a tax filing."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                    <span>
                      <b className="font-medium text-ink">{t}</b> {d}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="overflow-hidden rounded-[28px] border border-sand bg-white/70">
                {[
                  {
                    group: "Confidential on NEAR",
                    dot: "bg-gold",
                    rows: [
                      ["Your balances and holdings", "Not visible on any public block explorer."],
                      ["Payments to other NEAR Intents accounts", "Amount and recipient aren't published."],
                    ],
                  },
                  {
                    group: "Public on-chain",
                    dot: "bg-ink",
                    rows: [
                      [
                        "Money in and money out",
                        "Deposits and withdrawals are visible on the chain they use. They aren't directly tied to your balance, but matching amounts and timing can reveal the link.",
                      ],
                    ],
                  },
                  {
                    group: "Seen by services",
                    dot: "border border-ink-45",
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
                    dot: "border border-ink-45",
                    rows: [["Blurred balances", "Hides numbers from someone looking over your shoulder. It is not encryption."]],
                  },
                ].map(({ group, dot, rows }) => (
                  <div key={group} className="border-b border-sand last:border-b-0">
                    <div className="flex items-center gap-2 bg-gold-soft/45 px-6 py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink-60">
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {group}
                    </div>
                    {rows.map(([what, detail]) => (
                      <div key={what} className="border-t border-sand px-6 py-4">
                        <div className="text-[15px]">{what}</div>
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

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-4 py-[clamp(48px,5vw,80px)] sm:px-8">
          <Reveal className="mx-auto max-w-[1200px]">
            <div className="rounded-[28px] border border-sand bg-cream p-6 sm:p-10">
              <div className="flex items-center gap-5">
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-gold/60 text-gold-ink">
                  <QuestionIcon />
                </span>
                <div>
                  <h2 className="font-serif text-[clamp(28px,2vw_+_14px,40px)] leading-tight text-[#141413]">Frequently Asked Questions</h2>
                  <p className="text-[14px] text-ink-60">Lumen&apos;s features, privacy and how it works.</p>
                </div>
              </div>
              <div className="mt-6">
                <Faq />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Call to action */}
        <section className="px-4 pb-[clamp(56px,6vw,96px)] pt-4 text-center">
          <Reveal>
            <h2 className={serifH2}>Your finances, finally yours.</h2>
            <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-relaxed text-ink-60 md:text-[17px]">
              Create a passkey on your device and you&apos;re in. No seed phrase, nothing to install.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <PillLink href="/app">Open your account</PillLink>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center rounded-full border border-ink px-7 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
              >
                Try the demo
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-sand bg-[#efe6d6] px-4 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-[13px] text-ink-60">
            <Logo size={18} />
            <span>Built on NEAR</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] text-[#141413]">
            <a href="#about" className="hover:opacity-70">
              About
            </a>
            <a href="#privacy" className="hover:opacity-70">
              Privacy
            </a>
            <a href="#faq" className="hover:opacity-70">
              FAQ
            </a>
            <Link href="/legal" className="hover:opacity-70">
              Terms and risks
            </Link>
          </nav>
          <div className="flex items-center gap-5 text-[#141413]">
            <a href={DEMO_POST} target="_blank" rel="noopener noreferrer" aria-label="Lumen demo video on X" className="hover:opacity-70">
              <XLogo size={22} />
            </a>
            <a href={REPO} target="_blank" rel="noopener noreferrer" aria-label="Lumen on GitHub" className="hover:opacity-70">
              <GitHubLogo size={22} />
            </a>
            <a href="https://near.org" target="_blank" rel="noopener noreferrer" aria-label="NEAR Protocol" className="hover:opacity-70">
              <NearLogo size={22} />
            </a>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-[1200px] text-[13px] leading-relaxed text-ink-45">
          Tokenized stocks and ETFs are issued by Ondo Global Markets, give economic exposure only, and are not available to US persons or
          in restricted jurisdictions. Prices can fall as well as rise. Lumen does not provide investment advice and never holds your funds.
        </p>
        {/* Brand signature: the logo's wordmark. Spans the width on phones and tablets (cqw); capped on wide screens so it
            stays a quiet sign-off rather than the loudest thing on the page. */}
        <div aria-hidden className="@container mx-auto mt-10 max-w-[1200px] select-none overflow-x-clip sm:mt-12">
          <div className="whitespace-nowrap text-center text-[min(40.5cqw,190px)] font-medium leading-[0.78] tracking-[-0.06em] text-ink/[0.055]">
            lumen
          </div>
        </div>
      </footer>
    </div>
  );
}
