"use client";

import { useEffect, useState } from "react";
import { useAccount } from "./account-app";
import { usd } from "./use-markets";

type RealItem = {
  id: string;
  at: number;
  status: string;
  title: string;
  detail: string;
  amountIn: string | null;
  amountOut: string | null;
  confidential: boolean;
};

type ActivityResponse = { demo: boolean; available: boolean; reason?: "invite-only" | "error"; items: RealItem[] };

const STATUS: Record<string, string> = {
  SUCCESS: "Completed",
  PROCESSING: "Processing",
  PENDING_DEPOSIT: "Waiting for deposit",
  INCOMPLETE_DEPOSIT: "Deposit incomplete",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

const day = (at: number) => new Date(at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const time = (at: number) => new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function groupByDay<T extends { at: number }>(items: T[]) {
  const groups: { label: string; items: T[] }[] = [];
  for (const it of items) {
    const label = day(it.at);
    const g = groups[groups.length - 1];
    if (g?.label === label) g.items.push(it);
    else groups.push({ label, items: [it] });
  }
  return groups;
}

export function Activity() {
  const { account, activity } = useAccount();
  const [real, setReal] = useState<ActivityResponse | null>(null);

  useEffect(() => {
    if (account.demo) return;
    let alive = true;
    fetch("/api/activity", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: ActivityResponse) => alive && setReal(d))
      .catch(() => alive && setReal({ demo: false, available: false, reason: "error", items: [] }));
    return () => {
      alive = false;
    };
  }, [account.demo]);

  return (
    <div className="pb-16 pt-10">
      <h1 className="text-[clamp(32px,5vw,44px)] font-normal leading-tight tracking-[-0.035em]">Activity</h1>
      <p className="mt-2 text-[15px] text-ink-60">Every transaction on your account and its status.</p>

      {account.demo ? (
        activity.length === 0 ? (
          <Empty text="No demo activity yet. Try a buy or a send." />
        ) : (
          groupByDay(activity).map((g) => (
            <section key={g.label} className="mt-8">
              <h2 className="text-[13px] text-ink-45">{g.label}</h2>
              <div className="mt-2 border border-hairline bg-paper">
                {g.items.map((r) => (
                  <div key={r.id} className="flex justify-between gap-4 border-b border-hairline px-4 py-3.5 text-sm last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate">{r.title}</div>
                      <div className="text-xs text-ink-45">
                        {time(r.at)} · {r.detail} · simulated
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`tabular ${r.cashDelta > 0 ? "text-up" : ""}`}>
                        {r.cashDelta > 0 ? "+" : "−"}
                        {usd(Math.abs(r.cashDelta))}
                      </div>
                      <div className="text-xs text-ink-45">Completed</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )
      ) : !real ? (
        <div className="mt-8 h-32 animate-pulse border border-hairline bg-paper" />
      ) : !real.available ? (
        <div className="mt-8 border border-hairline bg-paper p-6">
          <div className="text-lg tracking-[-0.015em]">
            {real.reason === "invite-only" ? "History isn't available to Lumen yet" : "History couldn't be loaded"}
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-60">
            {real.reason === "invite-only"
              ? "NEAR Intents only shares confidential transaction history with approved apps for now. Your transactions are still recorded on your account; Lumen will list them here once access opens."
              : "NEAR Intents didn't respond. Try again in a moment."}
          </p>
        </div>
      ) : real.items.length === 0 ? (
        <Empty text="No transactions yet." />
      ) : (
        groupByDay(real.items).map((g) => (
          <section key={g.label} className="mt-8">
            <h2 className="text-[13px] text-ink-45">{g.label}</h2>
            <div className="mt-2 border border-hairline bg-paper">
              {g.items.map((r) => (
                <div key={r.id} className="flex justify-between gap-4 border-b border-hairline px-4 py-3.5 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate">{r.title}</div>
                    <div className="truncate text-xs text-ink-45">
                      {time(r.at)} · {r.detail}
                      {r.confidential ? " · confidential" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular">{r.amountOut ?? r.amountIn ?? "—"}</div>
                    <div className={`text-xs ${r.status === "FAILED" ? "text-down" : "text-ink-45"}`}>{STATUS[r.status] ?? r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-8 border border-hairline bg-paper px-4 py-6 text-center text-sm text-ink-60">{text}</p>;
}
