"use client";

import Link from "next/link";
import { Check, ChevronRight, Copy } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { PasskeyIcon, PrivateIcon, StatementIcon } from "@/components/brand/icons";
import { storedPasskey } from "@/lib/passkey-client";
import { isEligibilityConfirmed, revealByDefault, setEligibilityConfirmed, setRevealByDefault } from "@/lib/prefs";
import { buildStatement, download, signStatement } from "@/lib/statement";
import { signStatementWithWallet } from "@/lib/wallet-client";
import { useAccount } from "./account-app";
import { useMarkets } from "./use-markets";

export function Settings() {
  const { account, activity } = useAccount();
  const markets = useMarkets();
  const [reveal, setReveal] = useState(revealByDefault);
  const [eligible, setEligible] = useState(isEligibilityConfirmed);
  const [hasPasskey] = useState(() => !!storedPasskey());
  const noteRef = useRef<HTMLParagraphElement>(null);
  const [copied, setCopied] = useState(false);
  const [statementState, setStatementState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [statementNote, setStatementNote] = useState<string | null>(null);

  // Show the result first, then start the download: on phones the browser's download bar can cover the note.
  function finish(note: string, save: () => void) {
    setStatementState("done");
    setStatementNote(note);
    // A timer, not requestAnimationFrame: rAF is paused while the tab is in the background (e.g. under the passkey sheet).
    setTimeout(() => {
      noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(save, 300);
    }, 0);
  }

  async function exportStatement() {
    setStatementState("working");
    setStatementNote(null);
    const prices = Object.fromEntries((markets?.rows ?? []).map((r) => [r.symbol, r.price]));
    const statement = buildStatement({ signerId: account.signerId, demo: !!account.demo, balances: account.balances, prices, activity });
    const stamp = statement.generatedAt.slice(0, 10);
    try {
      if (account.demo) {
        finish("Demo statements aren't signed: there's no real account behind them.", () =>
          download(`lumen-demo-statement-${stamp}.json`, { statement, signature: null }),
        );
      } else {
        const wallet = account.standard === "erc191" || account.standard === "nep413";
        const signed = wallet ? await signStatementWithWallet(account.signerId, JSON.stringify(statement)) : await signStatement(statement);
        if (!signed) {
          setStatementState("error");
          setStatementNote(
            wallet
              ? "This browser isn't connected to the wallet for this account, so the statement can't be signed here."
              : "This device doesn't hold the passkey for this account, so the statement can't be signed here.",
          );
          return;
        }
        finish(`Signed with your ${wallet ? "wallet" : "passkey"}. Anyone with the file can check it came from this account.`, () =>
          download(`lumen-statement-${stamp}.json`, signed),
        );
      }
    } catch {
      setStatementState("error");
      setStatementNote("The passkey prompt was closed. Nothing was exported.");
    }
  }

  return (
    <div className="pb-16 pt-6 md:pt-10">
      <h1 className="text-[clamp(32px,5vw,44px)] font-normal leading-tight tracking-[-0.035em]">Settings</h1>

      <Section title="Account" Icon={PasskeyIcon}>
        <Item label="Account id">
          <span className="flex items-center gap-2">
            <span className="tabular break-all text-right text-sm">{account.demo ? "Demo account" : account.signerId}</span>
            {!account.demo && (
              <button
                type="button"
                aria-label="Copy account id"
                onClick={async () => {
                  await navigator.clipboard.writeText(account.signerId).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex-none p-1 transition-opacity hover:opacity-70"
              >
                {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
              </button>
            )}
          </span>
        </Item>
        <Item label="Sign-in">
          <span className="text-sm text-ink-60">
            {account.demo
              ? "None (demo)"
              : account.standard === "erc191"
                ? "EVM wallet (recovery phrase is your backup)"
                : account.standard === "nep413"
                  ? "NEAR wallet (recovery phrase is your backup)"
                  : hasPasskey
                    ? "Passkey on this device"
                    : "Passkey (stored on another device)"}
          </span>
        </Item>
      </Section>

      <Section title="Privacy" Icon={PrivateIcon}>
        <Item label="Show balances by default">
          <Toggle
            on={reveal}
            label="Show balances by default"
            onChange={(v) => {
              setRevealByDefault(v);
              setReveal(v);
            }}
          />
        </Item>
        <p className="px-4 pb-4 text-xs leading-relaxed text-ink-45">
          Blurring only hides numbers on this screen. It doesn&apos;t change what is visible on-chain.
        </p>
      </Section>

      <Section title="Investing" Icon={StatementIcon}>
        <Item label="Eligibility">
          <span className="flex items-center gap-3 text-sm">
            <span className="text-ink-60">{eligible ? "Confirmed on this device" : "Not confirmed"}</span>
            {eligible && (
              <button
                type="button"
                onClick={() => {
                  setEligibilityConfirmed(false);
                  setEligible(false);
                }}
                className="underline underline-offset-4 hover:opacity-70"
              >
                Withdraw
              </button>
            )}
          </span>
        </Item>
        <p className="px-4 pb-4 text-xs leading-relaxed text-ink-45">
          Tokenized stocks aren&apos;t available to US persons. You confirm eligibility before your first buy.
        </p>
      </Section>

      <Section title="Statement" Icon={StatementIcon}>
        <div className="p-4">
          <p className="text-[15px] leading-relaxed text-ink-60">
            Download your balances and activity as a file for an accountant or a tax filing.
            {account.demo
              ? ""
              : ` It's signed with your ${account.standard === "erc191" || account.standard === "nep413" ? "wallet" : "passkey"}, so it can be checked against your account id.`}
          </p>
          <button
            type="button"
            onClick={exportStatement}
            disabled={statementState === "working"}
            className="mt-4 h-11 border border-ink px-5 font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {statementState === "working" ? "Preparing…" : account.demo ? "Download demo statement" : "Sign and download"}
          </button>
          <p ref={noteRef} role="status" className={`text-sm ${statementNote ? "mt-3" : ""} ${statementState === "error" ? "text-down" : "text-ink-60"}`}>
            {statementNote}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-45">
            This is your own signed record, not a statement issued by NEAR Intents.
          </p>
        </div>
      </Section>

      <Section title="About Lumen" Icon={PrivateIcon}>
        {[
          ["/", "Lumen website"],
          ["/#privacy", "What's private, and what isn't"],
          ["/legal", "Terms and risks"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between border-b border-hairline px-4 py-3.5 text-sm transition-colors last:border-b-0 hover:bg-mist"
          >
            {label}
            <ChevronRight size={16} strokeWidth={1.5} className="text-ink-45" aria-hidden />
          </Link>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, Icon, children }: { title: string; Icon: typeof PasskeyIcon; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-[13px] text-ink-45">
        <Icon size={16} /> {title}
      </h2>
      <div className="mt-2 border border-hairline bg-paper">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-4 py-3.5 text-sm last:border-b-0">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none border transition-colors ${on ? "border-ink bg-ink" : "border-hairline bg-mist"}`}
    >
      <span className={`absolute top-0.5 h-[18px] w-[18px] transition-[left] duration-200 ${on ? "left-[22px] bg-white" : "left-0.5 bg-ink"}`} />
    </button>
  );
}
