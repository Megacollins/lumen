"use client";

import { Check, Copy, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { post, signWithPasskey, storedPasskey } from "@/lib/passkey-client";
import { signOrderWithWallet } from "@/lib/wallet-client";
import type { OrderSpec } from "@/lib/server/orders";
import { useAccount } from "./account-app";

type Prepared =
  | {
      step: "sign";
      standard: "webauthn" | "erc191" | "nep413";
      payload: string | { message: string; nonce: string; recipient: string };
      challenge: string | null;
      depositAddress: string;
      amountIn: string;
      amountOut: string;
      minAmountOut: number;
    }
  | { step: "deposit"; depositAddress: string; depositMemo: string | null; deadline: string | null; amountIn: string; amountOut: string };

type Phase = "idle" | "preparing" | "review" | "signing" | "submitting" | "settling" | "deposit" | "success" | "refunded" | "failed" | "error";

const POLL_MS = 3000;
const GIVE_UP_MS = 15 * 60_000;

/**
 * Places a real order: live quote → review of the exact terms → passkey/wallet signature → NEAR Intents → status
 * until it settles. Nothing is signed until the user confirms the live quote they see.
 * Only rendered when the server says the flow is executable (verified on mainnet, confidential).
 */
export function ExecuteOrder({ spec, label, depositChain }: { spec: OrderSpec; label: string; depositChain?: string }) {
  const { account, reload } = useAccount();
  const wallet = account.standard === "erc191" || account.standard === "nep413";
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [intentHash, setIntentHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(
      /NotAllowed|prompt was closed|cancel|timed out|reject|denied/i.test(msg)
        ? `The ${wallet ? "wallet request" : "passkey prompt"} was closed. Nothing was sent.`
        : msg,
    );
    setPhase("error");
  };

  // Step 1: live quote and the intent to sign. Shown for review; nothing is signed yet.
  async function run() {
    setError(null);
    setPhase("preparing");
    try {
      const p = await post<Prepared>("/api/execute/prepare", spec);
      setPrepared(p);
      setPhase(p.step === "deposit" ? "deposit" : "review");
    } catch (e) {
      fail(e);
    }
  }

  // Step 2, after the user confirms the exact terms: sign and submit.
  async function confirm() {
    const p = prepared;
    if (p?.step !== "sign") return;
    try {
      setPhase("signing");
      let signed: object;
      if (p.standard === "webauthn") {
        const pk = storedPasskey();
        if (!pk || typeof p.payload !== "string" || !p.challenge)
          throw new Error("This device doesn't hold the passkey for this account, so it can't sign here.");
        signed = await signWithPasskey(pk, p.payload, p.challenge);
      } else {
        signed = await signOrderWithWallet(p.standard, p.payload);
      }
      setPhase("submitting");
      const r = await post<{ intentHash: string }>("/api/execute/submit", signed);
      setIntentHash(r.intentHash);
      setPhase("settling");
    } catch (e) {
      fail(e);
    }
  }

  // Follow the order on NEAR Intents until it settles (or a deposit arrives and settles).
  const depositAddress = prepared?.depositAddress;
  const tracking = phase === "settling" || phase === "deposit";
  useEffect(() => {
    if (!tracking || !depositAddress) return;
    const started = Date.now();
    let alive = true;
    const t = setInterval(async () => {
      const res = await fetch(`/api/execute/status?depositAddress=${encodeURIComponent(depositAddress)}`).catch(() => null);
      const s = res?.ok ? ((await res.json()) as { status: string }).status : null;
      if (!alive) return;
      if (s === "SUCCESS") {
        setPhase("success");
        reload();
      } else if (s === "REFUNDED") {
        setPhase("refunded");
        reload();
      } else if (s === "FAILED") {
        setPhase("failed");
      } else if (Date.now() - started > GIVE_UP_MS) {
        setError("Still processing. It will show in Activity when NEAR Intents finishes.");
        setPhase("error");
      }
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tracking, depositAddress, reload]);

  if (phase === "idle")
    return (
      <div className="mt-6">
        <button type="button" onClick={run} className="h-[52px] w-full bg-ink font-medium text-white transition-opacity hover:opacity-70">
          {label}
        </button>
        <p className="mt-2 text-center text-xs text-ink-45">
          {spec.flow === "cash" && spec.kind === "add"
            ? "You'll get a one-time deposit address with a fresh quote."
            : `You'll confirm ${wallet ? "in your wallet" : "with your passkey"}. The price is re-quoted live first.`}
        </p>
      </div>
    );

  if (phase === "review" && prepared?.step === "sign") {
    const inUnit = spec.flow === "trade" && spec.side === "sell" ? spec.symbol : "USDC";
    const outUnit = spec.flow === "trade" && spec.side === "buy" ? spec.symbol : "USDC";
    const to = spec.flow === "cash" && spec.kind !== "add" ? spec.recipient : undefined;
    return (
      <div className="mt-6 border border-ink bg-paper p-5" role="region" aria-label="Review before signing">
        <p className="text-[13px] text-ink-60">Live quote. Check it before you sign.</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-ink-60">You pay</span>
            <span className="tabular">
              {prepared.amountIn} {inUnit}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-60">{to ? "They receive about" : "You receive about"}</span>
            <span className="tabular">
              {prepared.amountOut} {outUnit}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-60">At least</span>
            <span className="tabular">
              {prepared.minAmountOut} {outUnit}
            </span>
          </div>
          {to && (
            <div className="border-t border-hairline pt-2">
              <span className="text-ink-60">To</span>
              <span className="tabular mt-1 block break-all font-medium">{to}</span>
              <span className="mt-1 block text-xs text-ink-60">Payments can&apos;t be reversed. Check every character.</span>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPhase("idle")} className="h-11 border border-hairline text-sm font-medium transition-opacity hover:opacity-70">
            Cancel
          </button>
          <button type="button" onClick={confirm} className="h-11 bg-ink text-sm font-medium text-white transition-opacity hover:opacity-70">
            {wallet ? "Confirm in wallet" : "Confirm with passkey"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "deposit" && prepared?.step === "deposit")
    return (
      <div className="mt-6 border border-hairline bg-mist p-5">
        <p className="text-sm text-ink-70">
          Send exactly <b className="font-medium text-ink">{prepared.amountIn} USDC</b> on {depositChain ?? "the chosen network"} to:
        </p>
        <div className="mt-3 flex items-center gap-3 border border-hairline bg-paper p-3">
          <span className="tabular min-w-0 flex-1 break-all text-sm">{prepared.depositAddress}</span>
          <button
            type="button"
            aria-label="Copy deposit address"
            onClick={async () => {
              await navigator.clipboard.writeText(prepared.depositAddress).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex-none p-1 transition-opacity hover:opacity-70"
          >
            {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
          </button>
        </div>
        {prepared.depositMemo && <p className="mt-2 text-sm">Memo: <span className="tabular">{prepared.depositMemo}</span></p>}
        <p className="mt-3 text-xs leading-relaxed text-ink-60">
          Only USDC on {depositChain ?? "that network"}. This address is for this deposit only
          {prepared.deadline ? `, until ${new Date(prepared.deadline).toLocaleString()}` : ""}. Anything else may be lost.
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-70">
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden /> Waiting for your deposit…
        </p>
      </div>
    );

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: "Live quote", done: phase !== "preparing", active: phase === "preparing" },
    { label: wallet ? "Confirmed in your wallet" : "Confirmed with your passkey", done: ["submitting", "settling", "success", "refunded", "failed"].includes(phase), active: phase === "signing" },
    { label: "Sent to NEAR Intents", done: ["settling", "success", "refunded", "failed"].includes(phase), active: phase === "submitting" },
    { label: "Settled", done: phase === "success", active: phase === "settling" },
  ];

  return (
    <div className="mt-6 border border-hairline bg-mist p-5" role="status" aria-live="polite">
      {phase !== "error" && (
        <ol className="flex flex-col gap-2.5 text-sm">
          {steps.map((s) => (
            <li key={s.label} className={`flex items-center gap-2.5 ${s.done || s.active ? "text-ink" : "text-ink-45"}`}>
              {s.done ? (
                <Check size={16} strokeWidth={1.75} aria-hidden />
              ) : s.active ? (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden />
              ) : (
                <span className="h-4 w-4" aria-hidden />
              )}
              {s.label}
              {s.active && phase === "signing" && <span className="text-ink-60">: check your device</span>}
            </li>
          ))}
        </ol>
      )}

      {phase === "success" && <p className="mt-4 font-medium">Done. Your balance is updated.</p>}
      {phase === "refunded" && (
        <p className="mt-4 text-sm text-ink-70">NEAR Intents couldn&apos;t fill this order at the quoted price and refunded it to your balance.</p>
      )}
      {phase === "failed" && <p className="mt-4 text-sm text-down">The order failed on NEAR Intents and didn&apos;t settle.</p>}
      {phase === "error" && (
        <p className="flex items-start gap-2 text-sm text-down">
          <X size={16} strokeWidth={1.75} className="mt-0.5 flex-none" aria-hidden />
          {error}
        </p>
      )}
      {intentHash && (
        <p className="mt-3 text-xs text-ink-45">
          Intent <span className="tabular break-all">{intentHash}</span>
        </p>
      )}
      {(phase === "error" || phase === "failed") && (
        <button type="button" onClick={() => setPhase("idle")} className="mt-4 text-sm underline underline-offset-4 hover:opacity-70">
          Try again
        </button>
      )}
    </div>
  );
}
