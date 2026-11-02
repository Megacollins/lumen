"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

type Order = {
  depositAddress: string;
  summary: string;
  at: number;
  kind: "deposit" | "signed";
  deposit: { amount: string; chain: string; memo: string | null; deadline: string | null } | null;
};

const LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "Waiting for your deposit",
  KNOWN_DEPOSIT_TX: "Deposit seen",
  INCOMPLETE_DEPOSIT: "Deposit too small",
  PROCESSING: "Processing",
  SUCCESS: "Completed",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};
const FINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);
const REFRESH_MS = 15_000;

/**
 * Orders this account placed from this browser, with live status from NEAR Intents. Real accounts only: NEAR Intents'
 * own history is invite-only, so without this an order (or a deposit address) would be lost once its sheet closed.
 */
export function YourOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = ((await fetch("/api/execute/orders").then((r) => r.json()).catch(() => ({ orders: [] }))) as { orders: Order[] }).orders;
      if (!alive) return;
      setOrders(list);
      const pairs = await Promise.all(
        list.map(async (o) => {
          const r = await fetch(`/api/execute/status?depositAddress=${encodeURIComponent(o.depositAddress)}`).catch(() => null);
          const s = r?.ok ? ((await r.json()) as { status: string }).status : "";
          return [o.depositAddress, s] as const;
        }),
      );
      if (alive) setStatus(Object.fromEntries(pairs));
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!orders || orders.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[13px] text-ink-45">Your orders on this device</h2>
      <div className="mt-2 border border-hairline bg-paper">
        {orders.map((o) => {
          const s = status[o.depositAddress] ?? "";
          const waiting = o.kind === "deposit" && (s === "PENDING_DEPOSIT" || s === "INCOMPLETE_DEPOSIT" || s === "");
          return (
            <div key={o.depositAddress} className="border-b border-hairline px-4 py-3.5 text-sm last:border-b-0">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="break-words">{o.summary}</div>
                  <div className="text-xs text-ink-45">{new Date(o.at).toLocaleString()}</div>
                </div>
                <div className={`flex-none text-right text-xs ${s === "FAILED" ? "text-down" : s === "SUCCESS" ? "text-up" : "text-ink-60"}`}>
                  {s ? (LABEL[s] ?? s) : "Checking…"}
                  {s && !FINAL.has(s) && <span className="block text-ink-45">updates every 15s</span>}
                </div>
              </div>
              {waiting && o.deposit && (
                <div className="mt-3 border border-hairline bg-mist p-3">
                  <p className="text-xs text-ink-70">
                    Send exactly <b className="font-medium text-ink">{o.deposit.amount} USDC</b> on {o.deposit.chain} to:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="tabular min-w-0 flex-1 break-all text-xs">{o.depositAddress}</span>
                    <button
                      type="button"
                      aria-label="Copy deposit address"
                      onClick={async () => {
                        await navigator.clipboard.writeText(o.depositAddress).catch(() => {});
                        setCopied(o.depositAddress);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="flex-none p-1 transition-opacity hover:opacity-70"
                    >
                      {copied === o.depositAddress ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
                    </button>
                  </div>
                  {o.deposit.memo && <p className="mt-1 text-xs">Memo: {o.deposit.memo}</p>}
                  {o.deposit.deadline && (
                    <p className="mt-1 text-xs text-ink-45">Valid until {new Date(o.deposit.deadline).toLocaleString()}.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
