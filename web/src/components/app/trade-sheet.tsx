"use client";

import { useEffect, useState } from "react";
import { USDC, type Asset } from "@/lib/markets";
import { isEligibilityConfirmed, revealByDefault, setEligibilityConfirmed } from "@/lib/prefs";
import { useAccount } from "./account-app";
import { ExecuteOrder } from "./execute";
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

/** Quotes are dry runs and nothing is held, so we fetch a fresh one on this interval. */
const REFRESH_SEC = 30;

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
  const [eligible, setEligible] = useState(isEligibilityConfirmed);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [quotedAt, setQuotedAt] = useState<number | null>(null);
  const [quoteKey, setQuoteKey] = useState("");
  const [revealed] = useState(revealByDefault);
  const [now, setNow] = useState(() => Date.now());
  const cashBase = account.balances.find((b) => b.tokenId === USDC.assetId)?.available ?? "0";
  const cash = Number(cashBase) / 10 ** USDC.decimals;
  // Whole cents, from integer base units so float rounding can't shave a cent off.
  const maxBuy = Math.floor(Number(cashBase) / 10 ** (USDC.decimals - 2)) / 100;

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
  // Still quote (prices are useful before funding), but never offer to sign more than the cash on hand.
  const overCash = side === "buy" && !inputError && n > cash;

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
        setQuotedAt(Date.now());
        setQuoteKey(`${side}:${amount}`);
      } else {
        setQuote(null);
        setError(data.error ?? "Couldn't get a quote. Try again.");
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [canQuote, amount, side, asset.symbol, refresh]);

  // Count down to the next quote and fetch it when the time is up.
  useEffect(() => {
    if (!canQuote || quotedAt == null) return;
    const t = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at - quotedAt >= REFRESH_SEC * 1000) {
        // Ask once; the next quote's arrival restarts this timer.
        clearInterval(t);
        setRefresh((r) => r + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [canQuote, quotedAt]);

  // Only show a quote that belongs to the amount on screen.
  const shown = canQuote && quoteKey === `${side}:${amount}` ? quote : null;
  const nextQuoteIn = shown && quotedAt != null ? Math.max(0, REFRESH_SEC - Math.floor((now - quotedAt) / 1000)) : null;
  const unit = side === "buy" ? asset.symbol : "USDC";

  return (
    <div>
      <div className="mt-2 text-[13px] text-ink-60">
        {side === "buy" ? (
          <>
            From private cash ·{" "}
            <span className="veil tabular" data-revealed={revealed}>
              {usd(cash)}
            </span>
          </>
        ) : (
          `You hold ${holding.toFixed(4)} ${asset.symbol}`
        )}
      </div>
      <label className="sr-only" htmlFor="trade-amount">
        {side === "buy" ? "Amount in USD" : `Amount of ${asset.symbol} to sell`}
      </label>
      <div className="mt-1 flex items-baseline gap-1 border-b border-ink pb-1">
        {side === "buy" && <span className="text-[40px] tracking-[-0.04em] text-ink-45">$</span>}
        <input
          id="trade-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="tabular w-full min-w-0 bg-transparent text-[40px] tracking-[-0.04em] outline-none"
          placeholder="0"
        />
        {side === "sell" && <span className="text-[15px] text-ink-45">{asset.symbol}</span>}
      </div>
      <p className="tabular mt-2 h-5 text-[15px] text-ink-45">
        {shown ? `≈ ${Number(shown.amountOut).toFixed(side === "buy" ? 4 : 2)} ${unit}` : loading && canQuote ? "Quoting…" : ""}
      </p>
      {inputError && <p className="mt-2 text-sm text-down">{inputError}</p>}
      {overCash && <p className="mt-2 text-sm text-down">That&apos;s more than your private cash ({usd(cash)}).</p>}

      {side === "buy" ? (
        <div className="mt-4 flex gap-1.5">
          {[30, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              aria-pressed={Number(amount) === v}
              className={`h-9 flex-1 border text-sm transition-opacity hover:opacity-70 ${Number(amount) === v ? "border-ink font-medium" : "border-hairline"}`}
            >
              ${v}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount(String(maxBuy))}
            disabled={maxBuy < minOrderUsd}
            aria-pressed={maxBuy >= minOrderUsd && Number(amount) === maxBuy}
            title={maxBuy < minOrderUsd ? `You need at least ${usd(minOrderUsd)} in private cash` : undefined}
            className={`h-9 flex-1 border text-sm transition-opacity hover:opacity-70 disabled:opacity-40 disabled:hover:opacity-40 ${
              maxBuy >= minOrderUsd && Number(amount) === maxBuy ? "border-ink font-medium" : "border-hairline"
            }`}
          >
            Max
          </button>
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
              setEligibilityConfirmed(true);
              setEligible(true);
            }}
          />
          <span>
            I&apos;m not a US person, and I&apos;m allowed to buy tokenized securities where I live. I understand these tokens give economic
            exposure only.
          </span>
        </label>
      )}

      <div className="mt-6 flex flex-col gap-2.5 border-t border-hairline pt-4 text-sm">
        <Row label="You receive at least">{shown ? `${shown.minAmountOut.toFixed(side === "buy" ? 4 : 2)} ${unit}` : "—"}</Row>
        <Row label="Price impact and fees">{shown ? usd(Math.max(0, shown.amountInUsd - shown.amountOutUsd)) : "—"}</Row>
        <Row label="Estimated time">{shown ? `~${shown.timeEstimateSec}s` : "—"}</Row>
        <Row label="Settlement">
          {shown ? (
            shown.mode === "confidential" ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Confidential
              </span>
            ) : (
              "Public route (preview)"
            )
          ) : (
            "—"
          )}
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
              side === "buy"
                ? { [USDC.assetId]: -Number(amount), [asset.assetId]: out }
                : { [asset.assetId]: -Number(amount), [USDC.assetId]: out };
            return simulate(deltas, {
              kind: side,
              title: `${side === "buy" ? "Bought" : "Sold"} ${asset.name}`,
              detail: side === "buy" ? `${out.toFixed(4)} ${asset.symbol}` : `${Number(amount).toFixed(4)} ${asset.symbol}`,
              cashDelta: side === "buy" ? -Number(amount) : out,
            });
          }}
        />
      ) : shown?.executable && !overCash ? (
        <ExecuteOrder
          key={`${side}:${amount}`}
          spec={{ flow: "trade", symbol: asset.symbol, side, amount }}
          label={`${side === "buy" ? "Buy" : "Sell"} ${asset.symbol}`}
        />
      ) : (
        <PreviewNotice>
          <b>Preview only.</b> This is a real quote, but orders for {asset.symbol} open once its route passes a live test on mainnet.
          Nothing will be bought or sold.
        </PreviewNotice>
      )}
      <p className="tabular mt-3 text-center text-xs text-ink-45">
        {side === "buy" ? `Minimum order ${usd(minOrderUsd)}. ` : ""}
        {nextQuoteIn == null
          ? `Quotes refresh every ${REFRESH_SEC} seconds.`
          : loading || nextQuoteIn === 0
            ? "Getting a new quote…"
            : `New quote in 0:${String(nextQuoteIn).padStart(2, "0")}.`}
      </p>
    </div>
  );
}
