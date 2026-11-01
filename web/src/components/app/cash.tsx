"use client";

import { Check, Copy, Delete } from "lucide-react";
import { useState } from "react";
import { AddIcon, RevealIcon, SendIcon, StatementIcon } from "@/components/brand/icons";
import { CHAINS, type CashKind, type ChainId } from "@/lib/cash";
import { USDC } from "@/lib/markets";
import { revealByDefault } from "@/lib/prefs";
import { useAccount } from "./account-app";
import { ExecuteOrder } from "./execute";
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

export type Flow = CashKind | "receive";

const TITLES: Record<Flow, string> = {
  add: "Add money",
  send: "Send",
  withdraw: "Move out",
  receive: "Receive",
};

export function Cash() {
  const { account } = useAccount();
  const [revealed, setRevealed] = useState(revealByDefault);
  const [flow, setFlow] = useState<Flow | null>(null);
  const cash = Number(account.balances.find((b) => b.tokenId === USDC.assetId)?.available ?? "0") / 10 ** USDC.decimals;

  const actions: { id: Flow; label: string; Icon: typeof AddIcon }[] = [
    { id: "add", label: "Add", Icon: AddIcon },
    { id: "send", label: "Send", Icon: SendIcon },
    { id: "receive", label: "Receive", Icon: StatementIcon },
    { id: "withdraw", label: "Move out", Icon: SendIcon },
  ];

  return (
    <div className="pb-16 pt-6 md:pt-10">
      <div className="flex items-center gap-2 text-[13px] text-ink-60">
        <span className="h-[7px] w-[7px] rounded-full bg-gold" />
        Private cash · USDC
      </div>
      <div className="veil tabular mt-1.5 text-[clamp(44px,13vw,56px)] leading-none tracking-[-0.045em]" data-revealed={revealed}>
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

      <div className="mt-8 grid max-w-[520px] grid-cols-4 gap-2">
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
          Your USDC sits in a confidential balance on NEAR Intents. Payments between accounts happen there, out of public view. Money coming
          in and going out is visible on its own chain, but not directly tied to your balance.
        </p>
      </section>

      <CashSheet flow={flow} onClose={() => setFlow(null)} />
    </div>
  );
}

/** The Add / Send / Receive / Move out sheet, shared by Cash and Overview. */
export function CashSheet({ flow, onClose }: { flow: Flow | null; onClose: () => void }) {
  const { account } = useAccount();
  const cash = Number(account.balances.find((b) => b.tokenId === USDC.assetId)?.available ?? "0") / 10 ** USDC.decimals;
  return (
    <Sheet open={flow !== null} title={flow ? TITLES[flow] : ""} onClose={onClose}>
      {flow === "receive" ? (
        <ReceiveBody signerId={account.signerId} />
      ) : flow ? (
        <CashForm kind={flow} balance={cash} onDone={onClose} />
      ) : null}
    </Sheet>
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
            placeholder={
              kind === "send"
                ? "0x… or name.near"
                : chainInfo.address === "evm"
                  ? "0x…"
                  : chainInfo.address === "sol"
                    ? "Solana address"
                    : "name.near"
            }
            className="tabular mt-1 h-11 w-full border border-hairline bg-paper px-3 text-sm outline-none focus:border-ink"
          />
        </div>
      )}

      {kind === "send" ? (
        <SendAmount amount={amount} setAmount={setAmount} />
      ) : (
        <>
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
        </>
      )}
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
        {kind === "send" &&
          "With Confidential Intents, the amount and the recipient are hidden from the public. Lumen's server and NEAR Intents still see them when the payment is made."}
        {kind === "withdraw" &&
          `This leaves your private balance. The receiving address and amount will be public on ${chainInfo.name}, but not linked to your Lumen balance.`}
      </p>

      {account.demo && data ? (
        <SimulateButton
          label={kind === "add" ? "Simulate adding money" : kind === "send" ? "Simulate sending privately" : "Simulate moving out"}
          onDone={onDone}
          run={() => {
            const delta = kind === "add" ? Number(data.amountOut) : -Number(amount);
            const short = recipient.trim().length > 16 ? `${recipient.trim().slice(0, 8)}…${recipient.trim().slice(-4)}` : recipient.trim();
            return simulate(
              { [USDC.assetId]: delta },
              {
                kind,
                title:
                  kind === "add" ? `Added from ${chainInfo.name}` : kind === "send" ? `Sent to ${short}` : `Moved out to ${chainInfo.name}`,
                detail: kind === "send" ? "Private payment" : kind === "add" ? "Deposit, unlinked" : short,
                cashDelta: delta,
              },
            );
          }}
        />
      ) : data?.executable && !overBalance ? (
        <ExecuteOrder
          key={`${kind}:${amount}:${chain}:${recipient.trim()}`}
          spec={{ flow: "cash", kind, amount, chain, recipient: recipient.trim() }}
          label={kind === "add" ? "Get deposit address" : kind === "send" ? "Send privately" : "Move out with passkey"}
          depositChain={chainInfo.name}
        />
      ) : (
        <PreviewNotice>
          <b>Preview only.</b> This is a real quote from NEAR Intents, but {TITLES[kind].toLowerCase()} opens once it passes a live test on
          mainnet
          {data?.mode === "public-preview" ? " with Confidential Intents enabled" : ""}. No money will move.
        </PreviewNotice>
      )}
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

/** Big centred amount like a payment app. Phones get a number pad; mice and keyboards type into the field. */
function SendAmount({ amount, setAmount }: { amount: string; setAmount: (v: string) => void }) {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [whole, cents] = amount.split(".");

  const press = (k: (typeof KEYS)[number]) => {
    if (k === "del") return setAmount(amount.slice(0, -1));
    if (k === ".") {
      if (!amount.includes(".")) setAmount(amount === "" ? "0." : amount + ".");
      return;
    }
    if (amount.includes(".") && amount.split(".")[1].length >= 2) return;
    if (amount.replace(".", "").length >= 9) return;
    setAmount(amount === "0" ? k : amount + k);
  };

  return (
    <div className="mt-6">
      <label htmlFor="cash-amount" className="sr-only">
        Amount in USDC
      </label>
      <div className="flex items-baseline justify-center text-[clamp(48px,15vw,64px)] leading-none tracking-[-0.05em]">
        <span className={amount === "" ? "text-ink-45" : ""}>$</span>
        {touch ? (
          <output id="cash-amount" aria-live="polite" className="tabular">
            {amount === "" ? <span className="text-ink-45">0</span> : whole || "0"}
            <span className="text-ink-45">.{(cents ?? "").padEnd(2, "0")}</span>
          </output>
        ) : (
          <input
            id="cash-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0.00"
            size={Math.max(4, amount.length + 1)}
            className="tabular min-w-0 bg-transparent text-center outline-none placeholder:text-ink-45"
          />
        )}
      </div>
      <p className="mt-3 text-center text-[13px] text-ink-60">USDC · from private cash</p>
      <div className="mt-4 flex justify-center">
        <span className="inline-flex items-center gap-2 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink-70">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Hidden from the public
        </span>
      </div>
      {touch && (
        <div className="tabular mt-4 grid grid-cols-3">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "Delete" : k === "." ? "Decimal point" : undefined}
              className="flex h-12 items-center justify-center text-2xl transition-colors active:bg-mist sm:h-14"
            >
              {k === "del" ? <Delete size={24} strokeWidth={1.5} aria-hidden /> : k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
