"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fromBaseUnits } from "@/lib/markets";
import type { Filing, Headline, Underlying } from "@/lib/server/market-intel";
import type { StrategyCard } from "@/lib/server/strategy-views";
import { assetName, dateLabel, pct, STRATEGY_ASSETS } from "@/lib/strategy-assets";
import { useAccount } from "../account-app";
import { InvestTabs } from "../invest-tabs";
import { PerfChart } from "../strategies/parts";
import { usd, useMarkets } from "../use-markets";

type Insight = { symbol: string; name: string; underlying: Underlying | null; headlines: Headline[]; filings: Filing[] };
type Insights = {
  fetchedAt: string;
  tokens: { updatedAt: string | null; live: boolean; prices: Record<string, number | null> };
  assets: Insight[];
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
const signed = (r: number | null) => (r == null ? "text-ink-45" : r >= 0 ? "text-up" : "text-down");

export function Intelligence() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/intelligence/markets", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (r.ok) setData(d);
        else setError(d.error ?? "Market data couldn't be loaded.");
      })
      .catch(() => alive && setError("Market data couldn't be loaded."));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="pb-16">
      <InvestTabs />
      <h1 className="text-[32px] font-normal leading-tight tracking-[-0.035em] md:text-[36px]">
        Intelligence, <i>with sources</i>.
      </h1>
      <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-ink-60">
        Real movements, headlines and filings for every Lumen asset, an analysis of your own holdings when you ask for one, and alerts you
        choose. Every figure names where it came from. Informational only, not investment advice.
      </p>

      {data && <KeyInsights data={data} />}
      <AskLumen />
      <Portfolio insights={data} />

      <h2 id="markets" className="mt-12 scroll-mt-24 text-xl tracking-[-0.015em]">
        Market insights
      </h2>
      {error && <p className="mt-3 text-sm text-down">{error}</p>}
      {!data && !error && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[360px] animate-pulse border border-hairline bg-paper" />
          ))}
        </div>
      )}
      {data && <MarketInsights data={data} />}

      <Alerts />
    </div>
  );
}

/** Four headline facts, each computed from the data below and linking to it. */
function KeyInsights({ data }: { data: Insights }) {
  const [best, setBest] = useState<StrategyCard | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch("/api/strategies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { strategies: [] }))
      .then((d: { strategies: StrategyCard[] }) => {
        // Only strategies with at least a day of recorded prices count as a track record.
        const ranked = (d.strategies ?? [])
          .filter((s) => s.ret != null && s.points.length >= 2 && Date.now() - new Date(s.createdAt).getTime() >= 86_400_000)
          .sort((a, b) => b.ret! - a.ret!);
        if (alive) setBest(ranked[0] ?? null);
      })
      .catch(() => alive && setBest(null));
    return () => {
      alive = false;
    };
  }, []);

  const priced = data.assets.filter((a) => a.underlying?.change1d != null);
  const mover = [...priced].sort((a, b) => Math.abs(b.underlying!.change1d!) - Math.abs(a.underlying!.change1d!))[0];
  const up = priced.filter((a) => a.underlying!.change1d! > 0).length;
  const metal = (sym: string) => data.assets.find((a) => a.symbol === sym)?.underlying?.change5d ?? null;
  const card = "flex min-h-[132px] flex-col justify-between border border-hairline bg-paper p-4 transition-colors hover:bg-mist";
  const label = "text-[11px] uppercase tracking-[0.08em] text-ink-45";

  return (
    <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key insights">
      {mover && (
        <Link href={`/app/invest/${mover.symbol}`} className={card}>
          <span className={label}>Biggest move</span>
          <span>
            <span className="block text-[15px] leading-snug">{mover.name}</span>
            <span className={`tabular text-2xl tracking-[-0.02em] ${signed(mover.underlying!.change1d)}`}>
              {pct(mover.underlying!.change1d, 1)}
            </span>
          </span>
          <span className="text-[11px] text-ink-45">Last session · Yahoo Finance</span>
        </Link>
      )}
      <Link href="/app/invest/GLD" className={card}>
        <span className={label}>Gold &amp; silver, 5 days</span>
        <span className="flex flex-col gap-0.5 text-[15px]">
          <span className="flex justify-between gap-2">
            Gold <span className={`tabular ${signed(metal("GLD"))}`}>{pct(metal("GLD"), 1)}</span>
          </span>
          <span className="flex justify-between gap-2">
            Silver <span className={`tabular ${signed(metal("SLV"))}`}>{pct(metal("SLV"), 1)}</span>
          </span>
        </span>
        <span className="text-[11px] text-ink-45">GLD and SLV · Yahoo Finance</span>
      </Link>
      <a href="#markets" className={card}>
        <span className={label}>Market breadth</span>
        <span className="text-[15px] leading-snug">
          <span className="tabular text-2xl tracking-[-0.02em]">
            {up} of {priced.length}
          </span>
          <span className="block">Lumen assets rose in the last session</span>
        </span>
        <span className="text-[11px] text-ink-45">Underlying closes</span>
      </a>
      <Link href={best ? `/app/invest/strategies/${best.id}` : "/app/invest/strategies"} className={card}>
        <span className={label}>Top strategy</span>
        {best ? (
          <span>
            <span className="block truncate text-[15px] leading-snug">{best.name}</span>
            <span className={`tabular text-2xl tracking-[-0.02em] ${signed(best.ret)}`}>{pct(best.ret, 1)}</span>
          </span>
        ) : (
          <span className="text-[15px] leading-snug text-ink-60">
            {best === undefined ? "Loading…" : "None with a day of track record yet"}
          </span>
        )}
        <span className="text-[11px] text-ink-45">
          {best ? `Since ${dateLabel(best.createdAt)} · model return` : "Publish or browse strategies"}
        </span>
      </Link>
    </section>
  );
}

/** Not switched on: Lumen only sends questions to NEAR AI models in attested TEEs, and that needs NEAR AI Cloud credits. */
function AskLumen() {
  return (
    <section className="mt-8 border border-hairline bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg tracking-[-0.015em]">Ask Lumen</h2>
        <span className="border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Coming soon</span>
      </div>
      <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-60">
        An assistant for researching stocks, gold and strategies, answering only from the sources on this page. It will run on NEAR AI Cloud
        models that execute inside trusted hardware (TEEs), and Lumen will check each model&apos;s hardware attestation before sending it
        anything about your account. It needs NEAR AI Cloud credits, which this preview doesn&apos;t have yet, so there are no AI answers
        here rather than made-up ones.
      </p>
    </section>
  );
}

/** Runs in the browser on the balances the app already shows; nothing about the portfolio is sent anywhere. */
function Portfolio({ insights }: { insights: Insights | null }) {
  const { account } = useAccount();
  const markets = useMarkets();
  const [run, setRun] = useState(false);
  const [followed, setFollowed] = useState<StrategyCard[] | null>(null);

  async function analyse() {
    setRun(true);
    if (account.demo) return setFollowed([]);
    const [all, f] = await Promise.all([
      fetch("/api/strategies", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { strategies: [] })),
      fetch("/api/strategies/following", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { following: [] })),
    ]).catch(() => [{ strategies: [] }, { following: [] }]);
    const ids = new Set((f.following ?? []).map((x: { id: string }) => x.id));
    setFollowed((all.strategies ?? []).filter((s: StrategyCard) => ids.has(s.id)));
  }

  const holdings = STRATEGY_ASSETS.map((a) => {
    const base = account.balances.find((b) => b.tokenId === a.assetId)?.available ?? "0";
    const qty = Number(fromBaseUnits(base, a.decimals));
    const price = a.symbol === "USDC" ? 1 : (markets?.rows.find((r) => r.symbol === a.symbol)?.price ?? null);
    const move = insights?.assets.find((x) => x.symbol === a.symbol)?.underlying?.change1d ?? null;
    return { symbol: a.symbol, qty, price, value: price == null ? null : qty * price, move };
  }).filter((h) => h.qty > 0);
  const total = holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const unpriced = holdings.filter((h) => h.value == null);
  const ranked = [...holdings].filter((h) => h.value != null).sort((a, b) => b.value! - a.value!);
  const top = ranked.find((h) => h.symbol !== "USDC");
  const cash = holdings.find((h) => h.symbol === "USDC")?.value ?? 0;
  const contributions = ranked.filter((h) => h.symbol !== "USDC" && h.move != null).map((h) => ({ ...h, delta: h.value! * h.move! }));
  const dayMove = contributions.reduce((s, c) => s + c.delta, 0);
  const biggest = [...contributions].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const weights = Object.fromEntries(ranked.map((h) => [h.symbol, total ? (h.value! / total) * 100 : 0]));

  return (
    <section className="mt-4 border border-hairline bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg tracking-[-0.015em]">Your portfolio</h2>
        {account.demo && (
          <span className="border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Demo balances</span>
        )}
      </div>
      {!run ? (
        <>
          <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-60">
            Lumen can explain your allocation, what moved it and how it compares with strategies you follow. It works in your browser on the
            balances you already see here, and doesn&apos;t send them anywhere.
          </p>
          <button
            type="button"
            onClick={analyse}
            className="mt-4 h-11 bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-70"
          >
            Analyse my portfolio
          </button>
        </>
      ) : holdings.length === 0 ? (
        <p className="mt-2 text-sm text-ink-60">
          {account.balancesAvailable
            ? "There's nothing in this account yet. Once you add money or buy an asset, its allocation and movements appear here."
            : "Your balances couldn't be loaded from NEAR Intents just now, so there's nothing to analyse. Try again shortly."}
        </p>
      ) : (
        <div className="mt-3 text-sm leading-relaxed text-ink-70">
          <div className="tabular text-[32px] leading-none tracking-[-0.04em] text-ink">{usd(total)}</div>
          <p className="mt-1 text-xs text-ink-45">
            Valued at NEAR Intents prices{markets ? "" : " (loading)"}; USDC counted at $1.
            {unpriced.length ? ` No price right now for ${unpriced.map((u) => u.symbol).join(", ")}, so the total leaves it out.` : ""}
          </p>
          <div className="mt-4 flex h-2 w-full" aria-hidden>
            {ranked.map((h) => (
              <span
                key={h.symbol}
                className={h.symbol === "USDC" ? "bg-ink" : "bg-gold"}
                style={{ width: `${weights[h.symbol]}%`, opacity: h.symbol === "USDC" ? 1 : 0.55 + 0.45 * (weights[h.symbol] / 100) }}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {top && (
              <li>
                Your largest investment is <b className="font-medium text-ink">{assetName(top.symbol)}</b> at{" "}
                {weights[top.symbol].toFixed(0)}% of the account.
                {weights[top.symbol] > 50 && " That's more than half, so its moves drive most of your balance."}
              </li>
            )}
            <li>
              Cash (USDC) is {total ? ((cash / total) * 100).toFixed(0) : 0}% of the account
              {cash > 0 ? ", which doesn't move with markets" : ""}.
            </li>
            {contributions.length > 0 && (
              <li>
                Going by each underlying asset&apos;s last session, your investments would have moved about{" "}
                <b className={`font-medium ${signed(dayMove)}`}>
                  {dayMove >= 0 ? "+" : "−"}
                  {usd(Math.abs(dayMove))}
                </b>
                {biggest && (
                  <>
                    , mostly from {assetName(biggest.symbol)} ({pct(biggest.move)})
                  </>
                )}
                . The tokens can trade at slightly different prices, so treat this as an estimate.
              </li>
            )}
            {followed?.map((s) => {
              const keys = new Set([...Object.keys(s.weights), ...Object.keys(weights)]);
              const drift = Math.max(...[...keys].map((k) => Math.abs((weights[k] ?? 0) - (s.weights[k] ?? 0))));
              return (
                <li key={s.id}>
                  Compared with <b className="font-medium text-ink">{s.name}</b>, which you follow, your allocation differs by up to{" "}
                  {drift.toFixed(0)} percentage points{drift <= 5 ? ", so you're close to it" : ""}.
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-ink-45">
            Calculated by Lumen from your balances and the sources below. Not AI-generated, and not advice.
          </p>
        </div>
      )}
    </section>
  );
}

function MarketInsights({ data }: { data: Insights }) {
  const movers = data.assets
    .filter((a) => a.underlying?.change1d != null)
    .sort((a, b) => Math.abs(b.underlying!.change1d!) - Math.abs(a.underlying!.change1d!));
  return (
    <>
      {movers[0] && (
        <p className="mt-2 text-sm text-ink-60">
          Biggest move in the last session: <b className="font-medium text-ink">{movers[0].name}</b>{" "}
          <span className={signed(movers[0].underlying!.change1d)}>{pct(movers[0].underlying!.change1d, 1)}</span>.
        </p>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.assets.map((a) => (
          <AssetCard key={a.symbol} a={a} token={data.tokens.prices[a.symbol] ?? null} tokenAt={data.tokens.updatedAt} />
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-45">
        Underlying prices: Yahoo Finance daily closes (its public chart service, not an official API). Lumen prices: the NEAR Intents token
        list. Headlines: Google News search, limited to established outlets and linking to each article. Filings: SEC EDGAR. Fetched{" "}
        {ago(data.fetchedAt)}, refreshed every 15 minutes.
      </p>
    </>
  );
}

function AssetCard({ a, token, tokenAt }: { a: Insight; token: number | null; tokenAt: string | null }) {
  const u = a.underlying;
  const points = u ? u.closes.map((c) => ({ at: c.date, ret: c.close / u.closes[0].close - 1 })) : [];
  return (
    <section className="flex flex-col border border-hairline bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg tracking-[-0.015em]">{a.name}</div>
          <div className="text-xs text-ink-45">
            {a.symbol} · underlying of {a.symbol}on
          </div>
        </div>
        {u && (
          <div className="text-right">
            <div className="tabular text-xl">{usd(u.price)}</div>
            <div className="text-[11px] text-ink-45">as of {dateLabel(u.asOf)}</div>
          </div>
        )}
      </div>
      {u ? (
        <>
          <div className="mt-3 flex gap-2 text-xs">
            {(
              [
                ["1 day", u.change1d],
                ["5 days", u.change5d],
                ["1 month", u.change1m],
              ] as const
            ).map(([label, r]) => (
              <span key={label} className="border border-hairline px-2 py-1">
                <span className="text-ink-45">{label} </span>
                <span className={`tabular ${signed(r)}`}>{pct(r, 1)}</span>
              </span>
            ))}
          </div>
          <div className="mt-3">
            <PerfChart points={points} compact />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-60">Price history couldn&apos;t be loaded right now.</p>
      )}
      <div className="mt-3 flex justify-between border-t border-hairline pt-3 text-xs text-ink-60">
        <span>On Lumen ({a.symbol}on, NEAR Intents)</span>
        <span className="tabular">
          {token == null ? "—" : usd(token)}
          {tokenAt && <span className="text-ink-45"> · {ago(tokenAt)}</span>}
        </span>
      </div>

      <div className="mt-4 text-[11px] uppercase tracking-[0.08em] text-ink-45">Headlines</div>
      {a.headlines.length === 0 ? (
        <p className="mt-1 text-xs text-ink-45">No headlines from major outlets this week.</p>
      ) : (
        <ul className="mt-1 flex flex-col">
          {a.headlines.map((h) => (
            <li key={h.url} className="border-b border-hairline py-2 last:border-b-0">
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-snug hover:underline hover:underline-offset-4"
              >
                {h.title}
              </a>
              <div className="text-[11px] text-ink-45">
                {h.publisher} · {ago(h.publishedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {a.filings.length > 0 && (
        <>
          <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-ink-45">SEC filings</div>
          <ul className="mt-1 flex flex-col">
            {a.filings.map((f) => (
              <li key={f.url} className="flex justify-between gap-3 py-1.5 text-xs">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline hover:underline-offset-4">
                  {f.form} · {f.title}
                </a>
                <span className="flex-none text-ink-45">{dateLabel(f.filedAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

type Rule = { kind: "asset" | "strategy"; target: string; threshold: number };
type Event = { id: number; at: string; title: string; detail: string; source_name: string; source_url: string; seen: boolean };

/** Rules the person chooses; checked when they open this page and once a day. In-app only. */
function Alerts() {
  const { account } = useAccount();
  const [state, setState] = useState<{ rules: Rule[]; events: Event[] } | null>(null);
  const [following, setFollowing] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account.demo) return;
    let alive = true;
    fetch("/api/intelligence/alerts", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (r.ok) setState(d);
        else setError(d.error ?? "Alerts couldn't be loaded.");
      })
      .catch(() => alive && setError("Alerts couldn't be loaded."));
    fetch("/api/strategies/following", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setFollowing(d.following ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account.demo]);

  async function send(method: "POST" | "DELETE", body: object) {
    setError(null);
    const r = await fetch("/api/intelligence/alerts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setState(d);
    else setError(d.error ?? "Couldn't update alerts.");
  }

  const rule = (kind: Rule["kind"], target: string) => state?.rules.find((r) => r.kind === kind && r.target === target);
  const setRule = (kind: Rule["kind"], target: string, v: string) =>
    v === "off" ? send("DELETE", { kind, target }) : send("POST", { kind, target, threshold: Number(v) });
  const unseen = state?.events.filter((e) => !e.seen).length ?? 0;

  return (
    <section id="alerts" className="mt-12 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl tracking-[-0.015em]">
          Smart alerts{unseen > 0 && <span className="ml-2 align-middle text-sm text-gold">{unseen} new</span>}
        </h2>
        {unseen > 0 && (
          <button
            type="button"
            onClick={() => send("DELETE", { seen: true })}
            className="text-sm underline underline-offset-4 hover:opacity-70"
          >
            Mark all read
          </button>
        )}
      </div>
      {account.demo ? (
        <p className="mt-2 text-sm text-ink-60">Alerts are saved to your account, so they need a sign-in with a passkey or wallet.</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="border border-hairline bg-paper">
            <div className="px-4 pb-1 pt-3.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Tell me when</div>
            {STRATEGY_ASSETS.filter((a) => a.symbol !== "USDC").map((a) => (
              <RuleRow
                key={a.symbol}
                label={`${a.name} moves in a session by`}
                value={rule("asset", a.symbol)?.threshold}
                options={[2, 3, 5]}
                onChange={(v) => setRule("asset", a.symbol, v)}
              />
            ))}
            {following.map((s) => (
              <RuleRow
                key={s.id}
                label={`${s.name} changes or its return moves by`}
                value={rule("strategy", s.id)?.threshold}
                options={[1, 2, 5]}
                onChange={(v) => setRule("strategy", s.id, v)}
              />
            ))}
            <p className="border-t border-hairline px-4 py-3 text-xs leading-relaxed text-ink-45">
              Checked when you open this page and once a day. Alerts appear here; there are no push or email notifications yet.
              {following.length === 0 && " Follow a strategy to get alerts about it too."}
            </p>
          </div>
          <div className="border border-hairline bg-paper">
            <div className="px-4 pb-1 pt-3.5 text-[11px] uppercase tracking-[0.08em] text-ink-45">Recent alerts</div>
            {!state ? (
              <p className="px-4 py-3 text-sm text-ink-60">{error ?? "Loading…"}</p>
            ) : state.events.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-60">
                {state.rules.length ? "Nothing has crossed your thresholds yet." : "Choose what to watch, and alerts will appear here."}
              </p>
            ) : (
              state.events.map((e) => (
                <div key={e.id} className="border-t border-hairline px-4 py-3 first-of-type:border-t-0">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex items-start gap-2">
                      {!e.seen && <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" aria-label="New" />}
                      {e.title}
                    </span>
                    <span className="flex-none text-[11px] text-ink-45">{ago(e.at)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-60">{e.detail}</p>
                  <a
                    href={e.source_url}
                    {...(e.source_url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="mt-1 inline-block text-[11px] text-ink-45 underline underline-offset-4 hover:opacity-70"
                  >
                    Source: {e.source_name}
                  </a>
                </div>
              ))
            )}
            {state && error && <p className="border-t border-hairline px-4 py-3 text-sm text-down">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function RuleRow({ label, value, options, onChange }: { label: string; value?: number; options: number[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2.5 text-sm first-of-type:border-t-0">
      <span className="min-w-0">{label}</span>
      <select
        value={value == null ? "off" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 flex-none border border-hairline bg-mist px-2 text-sm outline-none focus:border-ink"
      >
        <option value="off">Off</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}% or more
          </option>
        ))}
        {value != null && !options.includes(value) && <option value={value}>{value}% or more</option>}
      </select>
    </label>
  );
}
