"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { post } from "@/lib/passkey-client";
import { useAccount } from "../account-app";
import { cleanWeights, WeightsEditor } from "./parts";

const field = "w-full border border-hairline bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-ink";

/** Publish a strategy. Percentages are always public; everything else about the creator is opt-in. */
export function StrategyForm() {
  const { account } = useAccount();
  const router = useRouter();
  const [me, setMe] = useState<{ handle: string } | null | undefined>(undefined);
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [approach, setApproach] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [showAccount, setShowAccount] = useState(false);
  const [checkHoldings, setCheckHoldings] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/strategies", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.me ?? null))
      .catch(() => setMe(null));
  }, []);

  if (account.demo)
    return (
      <div className="pb-16 pt-6">
        <Back />
        <p className="mt-6 max-w-[520px] text-[15px] leading-relaxed text-ink-60">
          Publishing a strategy needs a real account, so its holdings can be checked against NEAR Intents. Exit the demo and sign in with a
          passkey or wallet.
        </p>
      </div>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id } = await post<{ id: string }>("/api/strategies", {
        handle,
        bio,
        showAccount,
        name,
        focus,
        approach,
        weights: cleanWeights(weights),
        checkHoldings: checkHoldings || showValue,
        showValue,
      });
      router.push(`/app/invest/strategies/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="pb-16 pt-6">
      <Back />
      <h1 className="mt-6 text-[32px] font-normal leading-tight tracking-[-0.035em]">
        Publish a <i>strategy</i>.
      </h1>
      <p className="mt-3 max-w-[600px] text-[15px] leading-relaxed text-ink-60">
        A strategy is an allocation across Lumen&apos;s assets that others can follow. Its track record starts the moment you publish,
        priced from NEAR Intents. Nobody can trade from your account, and followers decide every trade themselves.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {me === null && (
            <fieldset className="flex flex-col gap-3 border border-hairline bg-mist p-4">
              <legend className="px-1 text-[11px] uppercase tracking-[0.08em] text-ink-45">Your creator profile</legend>
              <label className="text-sm">
                Creator name
                <input
                  value={handle}
                  onChange={(e) =>
                    setHandle(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 20),
                    )
                  }
                  placeholder="e.g. quiet_compounder"
                  className={`${field} mt-1.5`}
                  required
                  minLength={3}
                />
              </label>
              <label className="text-sm">
                Short bio <span className="text-ink-45">(optional)</span>
                <input value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} className={`${field} mt-1.5`} />
              </label>
            </fieldset>
          )}
          {me && <p className="text-sm text-ink-60">Publishing as @{me.handle}</p>}
          <label className="text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="e.g. Gold and big tech"
              className={`${field} mt-1.5`}
              required
              minLength={3}
            />
          </label>
          <label className="text-sm">
            Investment focus
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value.slice(0, 80))}
              placeholder="e.g. Long-term growth with a gold hedge"
              className={`${field} mt-1.5`}
              required
              minLength={3}
            />
          </label>
          <label className="text-sm">
            Approach
            <textarea
              value={approach}
              onChange={(e) => setApproach(e.target.value.slice(0, 1000))}
              rows={5}
              placeholder="How you choose and rebalance the holdings (at least 20 characters)."
              className={`${field} mt-1.5`}
              required
              minLength={20}
            />
          </label>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="text-sm">Allocation</div>
            <div className="mt-1.5">
              <WeightsEditor value={weights} onChange={setWeights} />
            </div>
          </div>

          <fieldset className="border border-hairline bg-paper p-4 text-sm">
            <legend className="px-1 text-[11px] uppercase tracking-[0.08em] text-ink-45">What you share</legend>
            <p className="text-ink-60">Always public: the name, focus, approach, allocation percentages and your creator name.</p>
            <Check checked={checkHoldings || showValue} disabled={showValue} onChange={setCheckHoldings} label="Check my holdings now">
              Lumen reads your NEAR Intents balance once and publishes only whether it matches this allocation, and when.
            </Check>
            <Check checked={showValue} onChange={setShowValue} label="Show my portfolio value as a range">
              For example &ldquo;$1,000 – $10,000&rdquo;, taken from the holdings check. Never the exact amount.
            </Check>
            {me === null && (
              <Check checked={showAccount} onChange={setShowAccount} label="Show my account id">
                Lets anyone link this profile to your NEAR Intents account. Off by default.
              </Check>
            )}
          </fieldset>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-down">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || me === undefined}
        className="mt-6 h-[52px] w-full bg-ink px-8 font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-50 sm:w-auto"
      >
        {busy ? "Publishing…" : "Publish strategy"}
      </button>
    </form>
  );
}

function Back() {
  return (
    <Link href="/app/invest/strategies" className="inline-flex items-center gap-1 text-sm text-ink-60 transition-opacity hover:opacity-70">
      <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> Strategies
    </Link>
  );
}

function Check({
  checked,
  onChange,
  label,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 flex gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 flex-none accent-ink"
      />
      <span>
        {label}
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-45">{children}</span>
      </span>
    </label>
  );
}
