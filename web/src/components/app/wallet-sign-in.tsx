"use client";

import { useState } from "react";
import {
  evmAvailable,
  finishAfterRegistration,
  nearWalletOptions,
  registerNearKey,
  signInWithEvm,
  signInWithNear,
  type NearRegistration,
} from "@/lib/wallet-client";

type NearOption = Awaited<ReturnType<typeof nearWalletOptions>>[number];

const friendly = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return /reject|denied|cancel|closed|User/i.test(msg) ? "The wallet request was closed. Nothing was signed." : msg;
};

/**
 * Secondary sign-in for people who already have a wallet: an EVM wallet (MetaMask and others) or a NEAR wallet.
 * The Lumen account is that wallet's own account, so the wallet's seed phrase is the backup.
 */
export function WalletSignIn({ onSignedIn, disabled }: { onSignedIn: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearOptions, setNearOptions] = useState<NearOption[] | null>(null);
  const [registration, setRegistration] = useState<NearRegistration | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  const near = (walletId: string) =>
    run(async () => {
      const r = await signInWithNear(walletId);
      if ("needsRegistration" in r) setRegistration(r.needsRegistration);
      else onSignedIn();
    });

  if (!open)
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-sm text-ink-60 underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-50"
      >
        Use a wallet instead
      </button>
    );

  const btn = "flex h-11 w-full items-center justify-center gap-2 border border-hairline bg-paper text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2 border border-hairline bg-mist p-4">
      {registration ? (
        <>
          <p className="text-sm leading-relaxed text-ink-70">
            <b className="font-medium text-ink">One-time setup for {registration.accountId}.</b> NEAR Intents needs your
            wallet&apos;s key registered before it accepts its signatures. Your wallet will ask you to approve one NEAR
            transaction (1 yoctoNEAR plus a little gas). Nothing else moves.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await registerNearKey(registration.walletId, registration.publicKey);
                await finishAfterRegistration(registration);
                onSignedIn();
              })
            }
            className="h-11 bg-ink text-sm font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {busy ? "Waiting for your wallet…" : "Register key and continue"}
          </button>
        </>
      ) : nearOptions ? (
        <>
          <p className="text-[13px] text-ink-60">Choose your NEAR wallet</p>
          {nearOptions.map((w) => (
            <button key={w.id} type="button" disabled={busy} onClick={() => near(w.id)} className={btn}>
              {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons come from the selector as data URLs */}
              {w.icon && <img src={w.icon} alt="" className="h-5 w-5" />}
              {w.name}
            </button>
          ))}
          <button type="button" onClick={() => setNearOptions(null)} className="mt-1 text-xs text-ink-60 underline underline-offset-4">
            Back
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await signInWithEvm();
                onSignedIn();
              })
            }
            className={btn}
          >
            {busy ? "Waiting for your wallet…" : "MetaMask or another EVM wallet"}
          </button>
          {!evmAvailable() && (
            <p className="text-xs text-ink-45">No EVM wallet found in this browser. On a phone, open Lumen in your wallet&apos;s browser.</p>
          )}
          <button type="button" disabled={busy} onClick={() => run(async () => setNearOptions(await nearWalletOptions()))} className={btn}>
            NEAR wallet
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-down">
          {error}
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed text-ink-45">
        Your Lumen account is your wallet&apos;s own account, so your wallet&apos;s recovery phrase is your backup. Lumen
        never holds your keys.
      </p>
    </div>
  );
}
