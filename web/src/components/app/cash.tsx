"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { AddIcon, RevealIcon, SendIcon, StatementIcon } from "@/components/brand/icons";
import { CHAINS, type CashKind, type ChainId } from "@/lib/cash";
import { USDC } from "@/lib/markets";
import { useAccount } from "./account-app";
import { PreviewNotice, Row, Sheet } from "./sheet";
import { SimulateButton } from "./simulate";
import { usd } from "./use-markets";
import { useQuote } from "./use-quote";

type CashQuote = {
  amountIn: string;
  amountOut: string;
  minAmountOut: number;
  timeEstimateSec: number;
  mode: "confidential" | "public-preview";
  executable: boolean;
};

type Flow = CashKind | "receive";

const TITLES: Record<Flow, string> = { add: "Add money", send: "Send", withdraw: "Move out", receive: "Receive" };

export function Cash() {
  const { account } = useAccount();
  const [revealed, setRevealed] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const cash = Number(account.balances.find((b) => b.tokenId === USDC.assetId)?.available ?? "0") / 10 ** USDC.decimals;

  const actions: { id: Flow; label: string; Icon: typeof AddIcon }[] = [
    { id: "add", label: "Add", Icon: AddIcon },
    { id: "send", label: "Send", Icon: SendIcon },
    { id: "receive", label: "Receive", Icon: StatementIcon },
    { id: "withdraw", label: "Move out", Icon: SendIcon },
  ];

  return (
    <div className="pb-16 pt-10">
      <div className="flex items-center gap-2 text-[13px] text-ink-60">
        <span className="h-[7px] w-[7px] rounded-full bg-gold" />
        Private cash · USDC
      </div>
      <div className="veil tabular mt-1.5 text-[56px] leading-none tracking-[-0.045em]" data-revealed={revealed}>
        {usd(cash)}
      </div>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-pressed={revealed}
        className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-60 transition-opacity hover:opacity-70"
      >
        <RevealIcon size={16} />
        {revealed ? "Hide balance" : "Reveal balance"}
      </button>

      <div className="mt-8 grid grid-cols-4 gap-2 md:max-w-[520px]">
        {actions.map(({ id, label, Icon }, i) => (
          <button
            key={id}
            type="button"
            onClick={() => setFlow(id)}
            className={`flex h-[72px] flex-col items-center justify-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70 ${
              i === 0 ? "bg-ink text-white" : "border border-hairline bg-paper"
            }`}
          >
            <Icon size={20} className={id === "withdraw" ? "-rotate-90" : undefined} />
            {label}
          </button>
        ))}
      </div>

      <section className="mt-10 border border-hairline bg-paper p-6 text-[15px] leading-relaxed text-ink-60">
        <h2 className="text-base text-ink">How your cash stays private</h2>
        <p className="mt-2">
          Your USDC sits in a confidential balance on NEAR Intents. Payments between accounts happen there, out of public
          view. Money coming in and going out is visible on its own chain, but not linked to your balance.
        </p>
      </section>

      <Sheet open={flow !== null} title={flow ? TITLES[flow] : ""} onClose={() => setFlow(null)}>
        {flow === "receive" ? (
          <ReceiveBody signerId={account.signerId} />
        ) : flow ? (
          <CashForm kind={flow} balance={cash} onDone={() => setFlow(null)} />
        ) : null}
      </Sheet>
    </div>
  );
}

function ReceiveBody({ signerId }: { signerId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6">
      <p className="text-[15px] leading-relaxed text-ink-60">
        Share your account id with another Lumen or NEAR Intents user. Money they send lands in your private balance.
      </p>
      <div className="mt-5 flex items-center gap-3 border border-hairline bg-mist p-4">
        <span className="tabular min-w-0 flex-1 break-all text-sm">{signerId}</span>
        <button
          type="button"
          aria-label="Copy account id"
          onClick={async () => {
            await navigator.clipboard.writeText(signerId).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex-none p-1 transition-opacity hover:opacity-70"
        >
          {copied ? <Check size={18} strokeWidth={1.5} /> : <Copy size={18} strokeWidth={1.5} />}
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-45">Usernames (@name) are coming. To receive from another chain, use Add money.</p>
    </div>
  );
}

function CashForm({ kind, balance, onDone }: { kind: CashKind; balance: number; onDone: () => void }) {
  const { account, simulate } = useAccount();
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState<ChainId>(kind === "add" ? "base" : "near");
  const [recipient, setRecipient] = useState("");
  const chainInfo = CHAINS.find((c) => c.id === chain)!;

  const n = Number(amount);
  const amountError = amount === "" || n > 0 ? null : "Enter an amount.";
  // Over-balance still quotes (nothing executes in preview), but must block a real send.
  const overBalance = kind !== "add" && n > balance;
  const needsRecipient = kind !== "add";
  const ready = amount !== "" && !amountError && (!needsRecipient || recipient.trim() !== "");

  const { data, error, loading } = useQuote<CashQuote>(
    "/api/cash/quote",
    ready ? { kind, amount, chain, recipient: recipient.trim() } : null,
  );

  return (
    <div>
      {kind !== "send" && (
        <fieldset className="mt-6">
          <legend className="text-[13px] text-ink-60">{kind === "add" ? "From USDC on" : "To USDC on"}</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChain(c.id)}
                aria-pressed={chain === c.id}
                className={`h-9 border px-3 text-sm transition-opacity hover:opacity-70 ${chain === c.id ? "border-ink" : "border-hairline"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {needsRecipient && (
        <div className="mt-6">
          <label htmlFor="cash-recipient" className="text-[13px] text-ink-60">
            {kind === "send" ? "To (Lumen or NEAR Intents account id)" : `${chainInfo.name} address`}
          </label>
          <input
            id="cash-recipient"
            autoComplete="off"
            spellCheck={false}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={kind === "send" ? "0x… or name.near" : chainInfo.address === "evm" ? "0x…" : chainInfo.address === "sol" ? "Solana address" : "name.near"}
            className="tabular mt-1 h-11 w-full border border-hairline bg-paper px-3 text-sm outline-none focus:border-ink"
          />
        </div>
      )}

      <label className="mt-6 block text-[13px] text-ink-60" htmlFor="cash-amount">
        Amount in USDC
      </label>
      <div className="mt-1 flex items-baseline gap-1 border-b border-ink pb-1">
        <span className="text-[40px] tracking-[-0.04em] text-ink-45">$</span>
        <input
          id="cash-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="tabular w-full bg-transparent text-[40px] tracking-[-0.04em] outline-none"
          placeholder="0"
        />
      </div>
      {amountError && <p className="mt-2 text-sm text-down">{amountError}</p>}
      {!amountError && overBalance && <p className="mt-2 text-sm text-down">That&apos;s more than your private cash ({usd(balance)}).</p>}
      {kind !== "add" && balance > 0 && (
        <button type="button" onClick={() => setAmount(String(balance))} className="mt-3 text-sm underline underline-offset-4">
          Use all ({usd(balance)})
        </button>
      )}

      <div className="mt-6 flex flex-col gap-2.5 border-t border-hairline pt-4 text-sm">
        <Row label={kind === "send" ? "They'd receive" : kind === "add" ? "Added to your private cash" : "Arrives on " + chainInfo.name}>
          {data ? `${Number(data.amountOut).toFixed(2)} USDC` : loading ? "Quoting…" : "—"}
        </Row>
        <Row label="At least">{data ? `${data.minAmountOut.toFixed(2)} USDC` : "—"}</Row>
        <Row label="Estimated time">{data ? `~${data.timeEstimateSec}s` : "—"}</Row>
        <Row label="Route">{data ? (data.mode === "confidential" ? "Confidential Intents" : "NEAR Intents (public preview)") : "—"}</Row>
      </div>
      {error && <p className="mt-3 text-sm text-down">{error}</p>}

      <p className="mt-5 text-sm leading-relaxed text-ink-60">
        {kind === "add" &&
          `You'll send USDC on ${chainInfo.name} to a one-time deposit address. That deposit is public on ${chainInfo.name}; with Confidential Intents, it can't be linked to your balance.`}
        {kind === "send" && "With Confidential Intents, only you and the recipient see the amount."}
        {kind === "withdraw" &&
          `This leaves your private balance. The receiving address and amount will be public on ${chainInfo.name}, but not linked to your Lumen balance.`}
      </p>

      {account.demo && data ? (
        <SimulateButton
          label={kind === "add" ? "Simulate adding money" : kind === "send" ? "Simulate sending" : "Simulate moving out"}
          onDone={onDone}
          run={() => {
            const delta = kind === "add" ? Number(data.amountOut) : -Number(amount);
            const short = recipient.trim().length > 16 ? `${recipient.trim().slice(0, 8)}…${recipient.trim().slice(-4)}` : recipient.trim();
            return simulate(
              { [USDC.assetId]: delta },
              {
                kind,
                title: kind === "add" ? `Added from ${chainInfo.name}` : kind === "send" ? `Sent to ${short}` : `Moved out to ${chainInfo.name}`,
                detail: kind === "send" ? "Private payment" : kind === "add" ? "Deposit, unlinked" : short,
                cashDelta: delta,
              },
            );
          }}
        />
      ) : data?.executable && !overBalance ? (
        <button type="button" className="mt-6 h-[52px] w-full bg-ink font-medium text-white transition-opacity hover:opacity-70">
          {kind === "add" ? "Get deposit address" : "Confirm with passkey"}
        </button>
      ) : (
        <PreviewNotice>
          <b>Preview only.</b> This is a real quote from NEAR Intents, but {TITLES[kind].toLowerCase()} opens once it
          passes a live test on mainnet{data?.mode === "public-preview" ? " with Confidential Intents enabled" : ""}. No money
          will move.
        </PreviewNotice>
      )}
    </div>
  );
}
