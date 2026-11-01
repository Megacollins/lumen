"use client";

import { useEffect, useState } from "react";
import { USDC, type Asset } from "@/lib/markets";
import { useAccount } from "./account-app";
import { PreviewNotice, Row, Sheet } from "./sheet";
import { SimulateButton } from "./simulate";
import { usd } from "./use-markets";

type Quote = {
  amountIn: string;
  amountInUsd: number;
  amountOut: string;
  amountOutUsd: number;
  minAmountOut: number;
  timeEstimateSec: number;
  mode: "confidential" | "public-preview";
  executable: boolean;
};

const ELIGIBLE_KEY = "lumen.eligibility.v1";

function readEligible() {
  try {
    return localStorage.getItem(ELIGIBLE_KEY) === "yes";
  } catch {
    return false;
  }
}

export function TradeSheet({
  open,
  side,
  asset,
  holding,
  minOrderUsd,
  onClose,
}: {
  open: boolean;
  side: "buy" | "sell";
  asset: Asset;
  holding: number;
  minOrderUsd: number;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} title={`${side === "buy" ? "Buy" : "Sell"} ${asset.name}`} onClose={onClose}>
      <TradeForm side={side} asset={asset} holding={holding} minOrderUsd={minOrderUsd} onDone={onClose} />
    </Sheet>
  );
}

function TradeForm({
  side,
  asset,
  holding,
  minOrderUsd,
  onDone,
}: {
  side: "buy" | "sell";
  asset: Asset;
  holding: number;
  minOrderUsd: number;
  onDone: () => void;
}) {
  const { account, simulate } = useAccount();
  const [amount, setAmount] = useState(side === "buy" ? String(minOrderUsd) : "");
  const [eligible, setEligible] = useState(readEligible);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const n = Number(amount);
  const inputError =
    amount === ""
      ? null
      : !(n > 0)
        ? "Enter an amount."
        : side === "buy" && n < minOrderUsd
          ? `The minimum order is ${usd(minOrderUsd)}.`
          : side === "sell" && n > holding
            ? holding > 0
              ? `You hold ${holding.toFixed(4)} ${asset.symbol}.`
              : `You don't hold any ${asset.symbol} yet.`
            : null;
  const canQuote = amount !== "" && !inputError && (side === "sell" || eligible);

  // Debounced live quote. State updates happen in the async callback, never synchronously in the effect.
  useEffect(() => {
    if (!canQuote) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: asset.symbol, side, amount }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!alive) return;
      setLoading(false);
      if (res?.ok) {
        setQuote(data);
        setError(null);
      } else {
        setQuote(null);
        setError(data.error ?? "Couldn't get a quote. Try again.");
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [canQuote, amount, side, asset.symbol]);

  const shown = canQuote ? quote : null;

  return (
    <div>
      <label className="mt-6 block text-[13px] text-ink-60" htmlFor="trade-amount">
        {side === "buy" ? "Amount in USD, from private cash" : `Amount of ${asset.symbol} to sell`}
      </label>
      <div className="mt-1 flex items-baseline gap-1 border-b border-ink pb-1">
        {side === "buy" && <span className="text-[40px] tracking-[-0.04em] text-ink-45">$</span>}
        <input
          id="trade-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="tabular w-full bg-transparent text-[40px] tracking-[-0.04em] outline-none"
          placeholder="0"
        />
      </div>
      {inputError && <p className="mt-2 text-sm text-down">{inputError}</p>}

      {side === "buy" ? (
        <div className="mt-4 flex gap-1.5">
          {[30, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className={`h-9 flex-1 border text-sm transition-opacity hover:opacity-70 ${Number(amount) === v ? "border-ink" : "border-hairline"}`}
            >
              ${v}
            </button>
          ))}
        </div>
      ) : (
        holding > 0 && (
          <button type="button" onClick={() => setAmount(String(holding))} className="mt-3 text-sm underline underline-offset-4">
            Sell all ({holding.toFixed(4)})
          </button>
        )
      )}

      {side === "buy" && !eligible && (
        <label className="mt-5 flex cursor-pointer gap-3 border border-hairline bg-mist p-4 text-sm leading-relaxed text-ink-70">
          <input
            type="checkbox"
            className="mt-1 accent-[#141413]"
            onChange={(e) => {
              if (!e.target.checked) return;
              try {
                localStorage.setItem(ELIGIBLE_KEY, "yes");
              } catch {}
              setEligible(true);
            }}
          />
          <span>
            I&apos;m not a US person, and I&apos;m allowed to buy tokenized securities where I live. I understand these
            tokens give economic exposure only.
          </span>
        </label>
      )}

      <div className="mt-6 flex flex-col gap-2.5 border-t border-hairline pt-4 text-sm">
        <Row label="You'd receive about">
          {shown ? `${Number(shown.amountOut).toFixed(side === "buy" ? 4 : 2)} ${side === "buy" ? asset.symbol : "USDC"}` : loading ? "Quoting…" : "—"}
        </Row>
        <Row label="At least">
          {shown ? `${shown.minAmountOut.toFixed(side === "buy" ? 4 : 2)} ${side === "buy" ? asset.symbol : "USDC"}` : "—"}
        </Row>
        <Row label="Price impact and fees">{shown ? usd(Math.max(0, shown.amountInUsd - shown.amountOutUsd)) : "—"}</Row>
        <Row label="Estimated time">{shown ? `~${shown.timeEstimateSec}s` : "—"}</Row>
        <Row label="Route">
          {shown ? (shown.mode === "confidential" ? "Confidential Intents" : "NEAR Intents (public preview)") : "—"}
        </Row>
      </div>
      {error && canQuote && <p className="mt-3 text-sm text-down">{error}</p>}

      {account.demo && shown ? (
        <SimulateButton
          label={`Simulate ${side === "buy" ? "buying" : "selling"} ${asset.symbol}`}
          onDone={onDone}
          run={() => {
            const out = Number(shown.amountOut);
            const deltas =
              side === "buy" ? { [USDC.assetId]: -Number(amount), [asset.assetId]: out } : { [asset.assetId]: -Number(amount), [USDC.assetId]: out };
            return simulate(deltas, {
              kind: side,
              title: `${side === "buy" ? "Bought" : "Sold"} ${asset.name}`,
              detail: side === "buy" ? `${out.toFixed(4)} ${asset.symbol}` : `${Number(amount).toFixed(4)} ${asset.symbol}`,
              cashDelta: side === "buy" ? -Number(amount) : out,
            });
          }}
        />
      ) : shown?.executable ? (
        <button type="button" className="mt-6 h-[52px] w-full bg-ink font-medium text-white transition-opacity hover:opacity-70">
          Confirm with passkey
        </button>
      ) : (
        <PreviewNotice>
          <b>Preview only.</b> This is a real quote, but orders for {asset.symbol} open once its route passes a live
          test on mainnet. Nothing will be bought or sold.
        </PreviewNotice>
      )}
    </div>
  );
}
