"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { findAsset, MIN_ORDER_USD } from "@/lib/markets";
import type { StrategyDetail as Detail } from "@/lib/server/strategy-views";
import { assetName, dateLabel, daysSince, pct } from "@/lib/strategy-assets";
import { post } from "@/lib/passkey-client";
import { useAccount } from "../account-app";
import { TradeSheet } from "../trade-sheet";
import { usd, useMarkets } from "../use-markets";
import { cleanWeights, Holdings, PerfChart, WeightsEditor } from "./parts";

export function StrategyDetail({ id }: { id: string }) {
  const [data, setData] = useState<{ strategy: Detail; canFollow: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/strategies/${id}`, { cache: "no-store" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      setData(d);
      setError(null);
    } else setError(d.error ?? "This strategy couldn't be loaded.");
  }, [id]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/strategies/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (r.ok) setData(d);
        else setError(d.error ?? "This strategy couldn't be loaded.");
      })
      .catch(() => alive && setError("This strategy couldn't be loaded."));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="pb-16 pt-6">
      <Link
        href="/app/invest/strategies"
        className="inline-flex items-center gap-1 text-sm text-ink-60 transition-opacity hover:opacity-70"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> Strategies
      </Link>
      {error && <p className="mt-6 text-sm text-down">{error}</p>}
      {!data && !error && <div className="mt-6 h-[420px] animate-pulse border border-hairline bg-paper" />}
      {data && <Body s={data.strategy} canFollow={data.canFollow} reload={load} />}
    </div>
  );
}

function Body({ s, canFollow, reload }: { s: Detail; canFollow: boolean; reload: () => Promise<void> }) {
  const { account } = useAccount();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copy, setCopy] = useState(false);
  const days = daysSince(s.createdAt);

  async function toggleFollow() {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/strategies/${s.id}/follow`, { method: s.following ? "DELETE" : "POST" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) setMsg(d.error ?? "Couldn't update. Try again.");
    await reload();
    setBusy(false);
  }

  return (
    <>
      <div className="mt-6 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-12">
        <div className="min-w-0">
          <p className="text-[13px] tracking-[0.08em] text-ink-45">STRATEGY</p>
          <h1 className="mt-1 text-[30px] font-normal leading-tight tracking-[-0.03em]">{s.name}</h1>
          <p className="mt-1 text-[15px] text-ink-60">{s.focus}</p>

          <div className="mt-6 flex items-end gap-3">
            <span
              className={`tabular text-[44px] leading-none tracking-[-0.04em] ${s.ret == null ? "text-ink-45" : s.ret >= 0 ? "text-up" : "text-down"}`}
            >
              {pct(s.ret)}
            </span>
            <span className="pb-1 text-[13px] text-ink-60">since {dateLabel(s.createdAt)}</span>
          </div>
          <div className="mt-5">
            <PerfChart points={s.points} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-45">
            Return of the published allocation, re-weighted at each change, from {s.snapshots}{" "}
            {s.snapshots === 1 ? "price snapshot" : "price snapshots"} Lumen recorded from NEAR Intents. It is a model, not the
            creator&apos;s realised return, and leaves out fees and slippage.{" "}
            <a href={`/api/strategies/${s.id}/prices`} className="text-ink underline underline-offset-4 hover:opacity-70">
              Download the prices
            </a>{" "}
            to recompute it.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 md:max-w-[420px]">
            {s.isOwner ? (
              <span className="col-span-2 flex h-[52px] items-center justify-center border border-hairline bg-mist text-sm text-ink-60">
                You publish this strategy
              </span>
            ) : canFollow ? (
              <button
                type="button"
                disabled={busy}
                onClick={toggleFollow}
                className={`h-[52px] font-medium transition-opacity hover:opacity-70 disabled:opacity-50 ${s.following ? "border border-ink bg-paper" : "bg-ink text-white"}`}
              >
                {s.following ? "Following" : "Follow strategy"}
              </button>
            ) : (
              <span className="flex h-[52px] items-center justify-center border border-hairline bg-mist px-3 text-center text-xs text-ink-60">
                {account.demo ? "Sign in with a passkey or wallet to follow" : "Sign in to follow"}
              </span>
            )}
            {!s.isOwner && (
              <button
                type="button"
                onClick={() => setCopy((c) => !c)}
                aria-expanded={copy}
                className="h-[52px] border border-ink bg-paper font-medium transition-opacity hover:opacity-70"
              >
                Copy allocation
              </button>
            )}
          </div>
          {msg && <p className="mt-3 text-sm text-down">{msg}</p>}
          {!s.isOwner && (
            <p className="mt-3 max-w-[480px] text-xs leading-relaxed text-ink-45">
              Following sends you this strategy&apos;s updates. It never trades for you: every buy is prepared by you, gets its own quote
              and needs your signature.
            </p>
          )}
          {copy && <CopyAllocation weights={s.weights} />}

          <h2 className="mt-10 text-base">Holdings</h2>
          <div className="mt-3">
            <Holdings weights={s.weights} />
          </div>

          <h2 className="mt-10 text-base">Approach</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-70">{s.approach}</p>

          <h2 className="mt-10 text-base">Updates</h2>
          {s.updates.length === 0 ? (
            <p className="mt-2 text-sm text-ink-60">No allocation changes since publishing.</p>
          ) : (
            <div className="mt-3 border border-hairline bg-paper">
              {s.updates.map((u, i) => (
                <div key={u.version} className="border-b border-hairline px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      {i < s.newUpdates && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="New" />}
                      Allocation changed
                    </span>
                    <span className="text-xs text-ink-45">{dateLabel(u.at)}</span>
                  </div>
                  {u.note && <p className="mt-1 text-sm text-ink-70">{u.note}</p>}
                  <p className="tabular mt-1 text-xs text-ink-45">
                    {Object.entries(u.weights)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, w]) => `${k} ${w}%`)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {s.isOwner && <OwnerPanel s={s} reload={reload} />}
        </div>

        <aside className="mt-10 flex flex-col gap-4 md:mt-0">
          <section className="border border-hairline bg-paper p-5">
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-45">Creator</div>
            <div className="mt-2 text-lg">@{s.creator.handle}</div>
            {s.creator.bio && <p className="mt-1 text-sm leading-relaxed text-ink-60">{s.creator.bio}</p>}
            <div className="mt-3 flex flex-col gap-1 text-xs text-ink-60">
              <span>
                On Lumen since {dateLabel(s.creator.since)} · {s.creator.strategies}{" "}
                {s.creator.strategies === 1 ? "strategy" : "strategies"}
              </span>
              <span className="tabular break-all">{s.creator.accountId ? `Account ${s.creator.accountId}` : "Account id not shared"}</span>
            </div>
          </section>

          <section className="border border-hairline bg-paper text-sm">
            <div className="px-5 pb-1 pt-4 text-[11px] uppercase tracking-[0.08em] text-ink-45">Track record</div>
            <Row label="Published" value={dateLabel(s.createdAt)} />
            <Row label="Running for" value={days === 0 ? "Less than a day" : days === 1 ? "1 day" : `${days} days`} />
            <Row label="Allocation changes" value={String(s.changes)} />
            <Row label="Followers" value={String(s.followers)} />
            <div className="border-t border-hairline px-5 py-3.5">
              <div className="flex justify-between gap-4">
                <span className="text-ink-60">Holdings check</span>
                <span className={s.check ? (s.check.matched ? "text-up" : "text-down") : "text-ink-45"}>
                  {s.check ? (s.check.matched ? "Matched" : "Didn't match") : "Not shared"}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-45">
                {s.check
                  ? `${dateLabel(s.check.at)}: Lumen read the creator's NEAR Intents balance with their permission and compared it with the allocation (within 5 points). ${
                      s.check.matched ? "" : s.check.reason
                    }${s.check.valueRange ? ` Portfolio value: ${s.check.valueRange}.` : ""}`
                  : "The creator hasn't asked Lumen to compare their real balance with this allocation."}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-hairline px-5 py-3 first-of-type:border-t-0">
      <span className="text-ink-60">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

/** Splits an amount across the allocation. Each buy opens the normal trade sheet: its own quote, its own signature. */
function CopyAllocation({ weights }: { weights: Record<string, number> }) {
  const { account } = useAccount();
  const markets = useMarkets();
  const min = markets?.minOrderUsd ?? MIN_ORDER_USD;
  const [amount, setAmount] = useState("500");
  const [open, setOpen] = useState<{ symbol: string; usd: number } | null>(null);
  const total = Number(amount) > 0 ? Number(amount) : 0;
  const rows = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([symbol, w]) => ({ symbol, w, usd: Math.floor(total * w) / 100 }));
  const asset = open ? findAsset(open.symbol) : undefined;
  const bal = asset ? account.balances.find((b) => b.tokenId === asset.assetId) : undefined;

  return (
    <div className="mt-4 border border-hairline bg-paper p-5">
      <label className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>How much would you put in?</span>
        <span className="flex items-center gap-1 border border-hairline bg-mist px-3">
          <span className="text-ink-45">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="tabular h-10 w-28 bg-transparent text-right outline-none"
            aria-label="Amount in US dollars"
          />
        </span>
      </label>
      <div className="mt-4 border-t border-hairline">
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center justify-between gap-3 border-b border-hairline py-3 text-sm last:border-b-0">
            <span className="min-w-0">
              <span className="block truncate">{assetName(r.symbol)}</span>
              <span className="text-xs text-ink-45">
                {r.w}% · {usd(r.usd)}
              </span>
            </span>
            {r.symbol === "USDC" ? (
              <span className="text-xs text-ink-45">Stays as cash</span>
            ) : r.usd < min ? (
              <span className="text-right text-xs text-ink-45">Below the {usd(min)} minimum</span>
            ) : (
              <button
                type="button"
                onClick={() => setOpen({ symbol: r.symbol, usd: r.usd })}
                className="h-9 flex-none bg-ink px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-70"
              >
                Prepare buy
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-45">
        Nothing happens until you review a quote and sign it. Each buy is separate, so you can skip or change any of them.
      </p>
      {asset && open && (
        <TradeSheet
          open
          side="buy"
          asset={asset}
          holding={Number(bal?.available ?? "0") / 10 ** asset.decimals}
          holdingBase={bal?.available ?? "0"}
          minOrderUsd={min}
          initialAmount={open.usd}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** The creator's own controls: change the allocation (followers see it as an update) and run a holdings check. */
function OwnerPanel({ s, reload }: { s: Detail; reload: () => Promise<void> }) {
  const [weights, setWeights] = useState<Record<string, number>>(s.weights);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"save" | "check" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      await post(`/api/strategies/${s.id}/allocation`, { weights: cleanWeights(weights), note });
      setNote("");
      setMsg({ ok: true, text: "Allocation updated. Followers will see it as an update." });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    }
    setBusy(null);
  }

  async function check() {
    setBusy("check");
    setMsg(null);
    try {
      const r = await post<{ matched: boolean; reason: string }>(`/api/strategies/${s.id}/check`, {});
      setMsg({ ok: r.matched, text: r.matched ? "Your holdings match this allocation." : r.reason });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't check." });
    }
    setBusy(null);
  }

  return (
    <section className="mt-10 border border-hairline bg-mist p-5">
      <h2 className="text-base">Manage your strategy</h2>
      <p className="mt-1 text-sm text-ink-60">Changes take effect at the next price snapshot and appear in followers&apos; updates.</p>
      <div className="mt-4">
        <WeightsEditor value={weights} onChange={setWeights} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 280))}
        placeholder="Why the change? (optional, shown to followers)"
        rows={2}
        className="mt-3 w-full border border-hairline bg-paper p-3 text-sm outline-none focus:border-ink"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={save}
          className="h-11 bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Publish change"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={check}
          className="h-11 border border-ink bg-paper px-5 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
        >
          {busy === "check" ? "Reading your balance…" : "Check my holdings"}
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs leading-relaxed text-ink-45">
        A holdings check reads your NEAR Intents balance once with your session and publishes only whether it matches and when (plus a value
        range, if you chose to show one). Your balances aren&apos;t stored.
      </p>
    </section>
  );
}
