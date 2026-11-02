"use client";

import { useId, useState, type ReactNode } from "react";
import { CANDIDATE_ASSETS, MIN_ORDER_USD } from "@/lib/markets";

const list = (names: string[]) => `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
const assets = list(CANDIDATE_ASSETS.map((a) => (a.kind === "Gold ETF" ? `${a.name} (a gold ETF)` : a.name)));

// Answers describe what the app does today; keep them in step with the privacy table and README.
const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "What is Lumen?",
    a: (
      <>
        A self-custodial account on NEAR for your dollars and your investments. You hold USDC, pay other NEAR Intents accounts and buy
        tokenized stocks and ETFs from one balance. Lumen is an early preview: balances, prices and quotes are real, and payments and orders
        switch on one by one after each passes a live test on mainnet.
      </>
    ),
  },
  {
    q: "How does privacy work?",
    a: (
      <>
        Your balance lives in NEAR Intents, using Confidential Intents: a private NEAR shard run by permissioned validators on trusted
        hardware (TEE). Balances and transfers kept there don&apos;t appear on public block explorers. The privacy rests on that hardware
        and those validators; it is not zero-knowledge cryptography.
      </>
    ),
  },
  {
    q: "Are my transactions private?",
    a: (
      <>
        Payments between NEAR Intents accounts are: the amount and recipient aren&apos;t published. Money you add or withdraw is still
        visible on the chain it uses, and matching amounts and timing can link it to you. Lumen&apos;s server and NEAR Intents see the
        details of each quote. In this preview, payments open after a live test.{" "}
        <a href="#privacy" className="text-ink underline underline-offset-4 hover:opacity-70">
          See who sees what
        </a>
        .
      </>
    ),
  },
  {
    q: "What can I invest in?",
    a: (
      <>
        {assets}, as tokens issued by Ondo Global Markets. Each token tracks its underlying asset and gives economic exposure only: no
        voting rights and no direct ownership. The minimum order is ${MIN_ORDER_USD}, and they aren&apos;t available to US persons or in
        restricted jurisdictions. Prices can fall as well as rise.
      </>
    ),
  },
  {
    q: "How are my funds secured?",
    a: (
      <>
        Lumen is self-custodial. Your passkey, or your own MetaMask or NEAR wallet, signs every order, and Lumen never sees its private key
        or holds your funds; they sit in the NEAR Intents contract on NEAR. Every order shows what you pay and receive before you sign.
        Smart contracts, trusted hardware and token issuers still carry risk, and Lumen has not had an independent security audit.
      </>
    ),
  },
];

function Item({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="border-b border-hairline">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-6 py-6 text-left text-[clamp(18px,1.6vw,21px)] tracking-[-0.015em] transition-opacity hover:opacity-70"
        >
          {q}
          <span aria-hidden className="relative h-3.5 w-3.5 flex-none">
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-ink" />
            <span
              className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                open ? "scale-y-0" : "scale-y-100"
              }`}
            />
          </span>
        </button>
      </h3>
      <div
        id={id}
        role="region"
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[620px] pb-7 text-[15px] leading-relaxed text-ink-60">{a}</p>
        </div>
      </div>
    </div>
  );
}

/** Five questions in a quiet accordion; each opens on its own. */
export function Faq() {
  return (
    <div className="border-t border-hairline">
      {QUESTIONS.map((item) => (
        <Item key={item.q} {...item} />
      ))}
    </div>
  );
}
