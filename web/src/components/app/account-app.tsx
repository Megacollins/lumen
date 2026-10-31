"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo, Mark } from "@/components/brand/logo";
import { PasskeyIcon, RevealIcon } from "@/components/brand/icons";
import {
  createPasskey,
  forgetPasskey,
  passkeySupported,
  signInWithPasskey,
  signOut,
  storedPasskey,
  type StoredPasskey,
} from "@/lib/passkey-client";

const USDC = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

type Account = { signerId: string; balances: { tokenId: string; available: string }[]; balancesAvailable: boolean };

async function fetchAccount(): Promise<Account | null> {
  const res = await fetch("/api/account", { cache: "no-store" });
  const data = res.ok ? await res.json() : null;
  return data?.signedIn ? data : null;
}

export function AccountApp() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined); // undefined = loading
  const load = useCallback(() => fetchAccount().then(setAccount), []);

  useEffect(() => {
    let alive = true;
    fetchAccount().then((a) => alive && setAccount(a));
    return () => {
      alive = false;
    };
  }, []);

  if (account === undefined)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Mark size={32} className="animate-pulse" />
      </div>
    );
  if (!account) return <SignIn onSignedIn={load} />;
  return (
    <Overview
      account={account}
      onSignOut={async () => {
        await signOut();
        setAccount(null);
      }}
    />
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  // SignIn only mounts after the client-side account check, so reading browser storage here is safe.
  const [stored, setStored] = useState<StoredPasskey | null>(storedPasskey);
  const [supported] = useState(passkeySupported);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(create: boolean) {
    setBusy(true);
    setError(null);
    try {
      const pk = create || !stored ? await createPasskey() : stored;
      setStored(pk);
      await signInWithPasskey(pk);
      onSignedIn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/NotAllowed|cancel|timed out/i.test(msg) ? "The passkey prompt was closed. Try again when ready." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-studio md:items-center md:justify-center md:py-16">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-16 md:hidden">
        <div aria-hidden className="absolute h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(circle, rgba(240,223,174,0.85) 0%, rgba(236,235,232,0) 68%)" }} />
        <Mark size={104} className="relative" />
      </div>
      <div className="flex flex-col gap-3 border-t border-hairline bg-paper px-6 pb-9 pt-8 md:w-[440px] md:border md:p-10">
        <Logo size={16} />
        <h1 className="mt-1 text-[34px] font-normal leading-[1.1] tracking-[-0.035em]">
          Your money, visible only to <i>you</i>.
        </h1>
        <p className="mb-3 text-[15px] leading-relaxed text-ink-60">
          {stored ? "Welcome back. Sign in with the passkey on this device." : "Create a passkey to open your private account. No seed phrase, no password."}
        </p>

        {!supported ? (
          <p className="border border-hairline bg-mist p-4 text-sm text-ink-70">
            This browser can&apos;t use passkeys here. Open Lumen in Chrome, Safari or Edge over HTTPS (or on localhost).
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(false)}
              className="flex h-[52px] items-center justify-center gap-2.5 bg-ink font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-50"
            >
              <PasskeyIcon size={20} />
              {busy ? "Waiting for your passkey…" : stored ? "Continue with passkey" : "Create your passkey"}
            </button>
            {stored && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  forgetPasskey();
                  run(true);
                }}
                className="h-[52px] border border-ink font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                Create a new account instead
              </button>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-down">
            {error}
          </p>
        )}
        <p className="mt-2 text-center text-xs leading-relaxed text-ink-45">
          Your passkey never leaves your device. Lumen never holds your keys or funds.
        </p>
      </div>
    </div>
  );
}

function formatUsd(base: string) {
  const n = Number(base) / 1e6;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Overview({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const cash = account.balances.find((b) => b.tokenId === USDC);
  const other = account.balances.filter((b) => b.tokenId !== USDC);
  const short = `${account.signerId.slice(0, 6)}…${account.signerId.slice(-4)}`;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Logo size={18} />
        <div className="flex items-center gap-3 text-sm">
          <span className="tabular text-ink-60" title={account.signerId}>
            {short}
          </span>
          <button type="button" onClick={onSignOut} className="border border-hairline bg-paper px-3 py-1.5 transition-opacity hover:opacity-70">
            Sign out
          </button>
        </div>
      </header>

      <section className="pt-6">
        <div className="flex items-center gap-2 text-[13px] text-ink-60">
          <span className="h-[7px] w-[7px] rounded-full bg-gold" />
          Private balance
        </div>
        <div className="veil tabular mt-1.5 text-[56px] leading-none tracking-[-0.045em]" data-revealed={revealed}>
          {formatUsd(cash?.available ?? "0")}
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
        {!account.balancesAvailable && (
          <p className="mt-3 text-sm text-down">Balances couldn&apos;t be loaded from NEAR Intents just now.</p>
        )}
      </section>

      {other.length > 0 && (
        <section className="mt-8 border border-hairline bg-paper">
          <div className="px-4 pb-1.5 pt-3.5 text-[13px] text-ink-60">Other holdings</div>
          {other.map((b) => (
            <div key={b.tokenId} className="flex justify-between gap-4 border-t border-hairline px-4 py-3 text-sm">
              <span className="truncate">{b.tokenId}</span>
              <span className="veil tabular" data-revealed={revealed}>
                {b.available}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="mt-10 border border-hairline bg-paper p-6">
        <div className="text-lg tracking-[-0.015em]">Your private account is open</div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-60">
          You&apos;re signed in to NEAR Confidential Intents with your passkey. The balance above is read live from your
          confidential account. Adding money, sending and investing are being built next.
        </p>
        <p className="mt-4 text-xs text-ink-45">
          Account id: <span className="tabular break-all">{account.signerId}</span>
        </p>
      </section>
    </div>
  );
}
