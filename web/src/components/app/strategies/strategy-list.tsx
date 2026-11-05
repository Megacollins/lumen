"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StrategyCard } from "@/lib/server/strategy-views";
import { daysSince, pct } from "@/lib/strategy-assets";
import { useAccount } from "../account-app";
import { InvestTabs } from "../invest-tabs";
import { PerfChart } from "./parts";

type Following = { id: string; name: string; unseen: number };

export function StrategyList() {
  const { account } = useAccount();
  const [data, setData] = useState<{ strategies: StrategyCard[]; me: { handle: string } | null; canPublish: boolean } | null>(null);
  const [following, setFollowing] = useState<Following[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "following" | "mine">("all");

  useEffect(() => {
    let alive = true;
    fetch("/api/strategies", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (r.ok) setData(d);
        else setError(d.error ?? "Strategies couldn't be loaded.");
      })
      .catch(() => alive && setError("Strategies couldn't be loaded."));
    fetch("/api/strategies/following", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setFollowing(d.following ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const followed = new Set(following.map((f) => f.id));
  const unseen = following.filter((f) => f.unseen > 0);
  const shown = (data?.strategies ?? []).filter((s) =>
    filter === "following" ? followed.has(s.id) : filter === "mine" ? data?.me && s.creator.handle === data.me.handle : true,
  );

  return (
    <div className="pb-16">
      <InvestTabs />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-normal leading-tight tracking-[-0.035em] md:text-[36px]">
            Strategies, <i>in the open</i>.
          </h1>
          <p className="mt-3 max-w-[600px] text-[15px] leading-relaxed text-ink-60">
            Model allocations published by Lumen investors. Performance is measured from the moment a strategy is published, using prices
            Lumen records from NEAR Intents. Following one never trades for you.
          </p>
        </div>
        {data?.canPublish ? (
          <Link
            href="/app/invest/strategies/new"
            className="flex h-11 items-center bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-70"
          >
            Publish a strategy
          </Link>
        ) : account.demo ? (
          <span className="text-xs text-ink-45">Sign in with a passkey or wallet to publish or follow.</span>
        ) : null}
      </div>

      {unseen.length > 0 && (
        <div className="mt-6 border border-[#EBDDB4] bg-[#FBF5E4] p-4 text-sm text-[#6B5318]">
          {unseen.map((u) => (
            <Link key={u.id} href={`/app/invest/strategies/${u.id}`} className="flex items-center gap-2 hover:opacity-70">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-gold" />
              {u.name}: {u.unseen === 1 ? "1 new update" : `${u.unseen} new updates`}
            </Link>
          ))}
        </div>
      )}

      {(data?.canPublish || following.length > 0) && (
        <div className="mt-6 flex gap-2 text-sm">
          {(["all", "following", ...(data?.me ? ["mine"] : [])] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f as typeof filter)}
              className={`border px-3 py-1.5 transition-opacity hover:opacity-70 ${filter === f ? "border-ink bg-ink text-white" : "border-hairline bg-paper"}`}
            >
              {f === "all" ? "All" : f === "following" ? `Following${following.length ? ` (${following.length})` : ""}` : "Yours"}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-6 border border-hairline bg-paper p-4 text-sm text-down">{error}</p>}
      {!data && !error && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[260px] animate-pulse border border-hairline bg-paper" />
          ))}
        </div>
      )}
      {data && shown.length === 0 && (
        <div className="mt-6 border border-hairline bg-paper p-8 text-center">
          <p className="text-[15px] text-ink-60">
            {filter === "following"
              ? "You don't follow any strategies yet."
              : filter === "mine"
                ? "You haven't published a strategy yet."
                : "No strategies have been published yet."}
          </p>
          {data.canPublish && filter !== "following" && (
            <Link href="/app/invest/strategies/new" className="mt-4 inline-block underline underline-offset-4">
              Publish the first one
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {shown.map((s) => (
          <Link
            key={s.id}
            href={`/app/invest/strategies/${s.id}`}
            className="flex flex-col border border-hairline bg-paper p-5 transition-colors hover:bg-mist"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-lg tracking-[-0.015em]">{s.name}</div>
                <div className="mt-0.5 truncate text-[13px] text-ink-60">{s.focus}</div>
              </div>
              <div className="text-right">
                <div className={`tabular text-xl ${s.ret == null ? "text-ink-45" : s.ret >= 0 ? "text-up" : "text-down"}`}>
                  {pct(s.ret)}
                </div>
                <div className="text-[11px] text-ink-45">since publishing</div>
              </div>
            </div>
            <div className="mt-4">
              <PerfChart points={s.points} compact />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(s.weights)
                .sort((a, b) => b[1] - a[1])
                .map(([sym, w]) => (
                  <span key={sym} className="tabular border border-hairline px-1.5 py-0.5 text-[11px] text-ink-60">
                    {sym} {w}%
                  </span>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-xs text-ink-60">
              <span>
                @{s.creator.handle} · {trackRecord(s.createdAt)}
                {s.changes ? ` · ${s.changes} ${s.changes === 1 ? "change" : "changes"}` : ""}
              </span>
              <span className="flex items-center gap-3">
                {s.lastCheck?.matched && (
                  <span className="border border-[#BFD9CB] bg-[#EEF6F1] px-1.5 py-0.5 text-[11px] text-up">Holdings checked</span>
                )}
                <span>{s.followers === 1 ? "1 follower" : `${s.followers} followers`}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function trackRecord(createdAt: string) {
  const d = daysSince(createdAt);
  return d === 0 ? "started today" : d === 1 ? "1 day" : `${d} days`;
}
