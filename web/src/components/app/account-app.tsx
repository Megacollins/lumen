"use client";

import Link from "next/link";
import { List, Settings as SettingsIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo, Mark } from "@/components/brand/logo";
import { AddIcon, InvestIcon, PasskeyIcon, PrivateIcon } from "@/components/brand/icons";
import {
  createPasskey,
  forgetPasskey,
  passkeySupported,
  signInWithPasskey,
  signOut,
  storedPasskey,
  type StoredPasskey,
} from "@/lib/passkey-client";
import {
  applyToLedger,
  clearLedger,
  freshLedger,
  ledgerBalances,
  loadLedger,
  saveLedger,
  type Ledger,
  type Receipt,
} from "@/lib/demo-ledger";
import { signOutWallet } from "@/lib/wallet-client";
import { AlertsBell } from "./alerts-bell";
import { WalletSignIn } from "./wallet-sign-in";

export type Account = {
  signerId: string;
  balances: { tokenId: string; available: string }[];
  balancesAvailable: boolean;
  demo?: boolean;
  /** How this account signs: passkey (webauthn), EVM wallet (erc191) or NEAR wallet (nep413). */
  standard?: "webauthn" | "erc191" | "nep413";
};

type AccountCtx = {
  account: Account;
  reload: () => Promise<void>;
  /** Demo mode only: simulated activity, and a way to apply a simulated transaction. */
  activity: Receipt[];
  simulate: (deltas: Record<string, number>, receipt: Omit<Receipt, "id" | "at">) => boolean;
};
const Ctx = createContext<AccountCtx | null>(null);

export function useAccount() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAccount outside AccountGate");
  return c;
}

async function fetchAccount(): Promise<Account | null> {
  const res = await fetch("/api/account", { cache: "no-store" });
  const data = res.ok ? await res.json() : null;
  return data?.signedIn ? data : null;
}

/** Shows sign-in until there is a NEAR Intents session, then the app shell around the page. */
export function AccountGate({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined); // undefined = loading
  const reload = useCallback(() => fetchAccount().then(setAccount), []);

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
  if (!account) return <SignIn onSignedIn={reload} />;

  return (
    <SignedIn account={account} reload={reload} onSignedOut={() => setAccount(null)}>
      {children}
    </SignedIn>
  );
}

function SignedIn({
  account,
  reload,
  onSignedOut,
  children,
}: {
  account: Account;
  reload: () => Promise<void>;
  onSignedOut: () => void;
  children: ReactNode;
}) {
  // Demo accounts read balances from the simulated ledger; real accounts from NEAR Intents.
  const [ledger, setLedger] = useState<Ledger | null>(() => (account.demo ? loadLedger() : null));

  const simulate = useCallback<AccountCtx["simulate"]>(
    (deltas, receipt) => {
      if (!ledger) return false;
      const next = applyToLedger(ledger, deltas, receipt);
      if (!next) return false;
      saveLedger(next);
      setLedger(next);
      return true;
    },
    [ledger],
  );

  const shown: Account = ledger ? { ...account, balances: ledgerBalances(ledger) } : account;

  return (
    <Ctx.Provider value={{ account: shown, reload, activity: ledger?.activity ?? [], simulate }}>
      <Shell
        signerId={account.signerId}
        demo={!!account.demo}
        onResetDemo={() => {
          const fresh = freshLedger();
          saveLedger(fresh);
          setLedger(fresh);
        }}
        onSignOut={async () => {
          await signOut();
          await signOutWallet();
          if (account.demo) clearLedger();
          onSignedOut();
        }}
      >
        {children}
      </Shell>
    </Ctx.Provider>
  );
}

const ActivityTabIcon = ({ size }: { size?: number }) => <List size={size} strokeWidth={1.5} aria-hidden />;
const SettingsTabIcon = ({ size }: { size?: number }) => <SettingsIcon size={size} strokeWidth={1.5} aria-hidden />;

const TABS = [
  { href: "/app", label: "Overview", Icon: PrivateIcon },
  { href: "/app/cash", label: "Cash", Icon: AddIcon },
  { href: "/app/invest", label: "Invest", Icon: InvestIcon },
  { href: "/app/activity", label: "Activity", Icon: ActivityTabIcon },
  { href: "/app/settings", label: "Settings", Icon: SettingsTabIcon },
];

function Shell({
  signerId,
  demo,
  onResetDemo,
  onSignOut,
  children,
}: {
  signerId: string;
  demo: boolean;
  onResetDemo: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

  return (
    <div className="flex flex-1 flex-col pb-20 md:pb-0">
      {demo && (
        <div className="flex items-center justify-center gap-3 bg-ink px-4 py-2 text-center text-[13px] text-white">
          <span>
            <b className="font-medium">Demo.</b> Simulated balances<span className="hidden sm:inline"> and transactions</span>, real prices
            and quotes.
          </span>
          <button type="button" onClick={onResetDemo} className="flex-none underline underline-offset-4 hover:opacity-70">
            Reset
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-hairline bg-mist/85 backdrop-blur-[6px]">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-5">
          <Link href="/app" aria-label="Overview">
            <Logo size={18} />
          </Link>
          <nav className="hidden gap-1 md:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-2 text-sm transition-opacity hover:opacity-70 ${active(t.href) ? "text-ink" : "text-ink-45"}`}
                aria-current={active(t.href) ? "page" : undefined}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {!demo && <AlertsBell />}
            <span className="tabular hidden text-ink-60 sm:inline" title={signerId}>
              {demo ? "Demo account" : `${signerId.slice(0, 6)}…${signerId.slice(-4)}`}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="border border-hairline bg-paper px-3 py-1.5 transition-opacity hover:opacity-70"
            >
              {demo ? "Exit demo" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-5">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-hairline bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(href) ? "text-ink" : "text-ink-45"}`}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
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
        <div
          aria-hidden
          className="absolute h-[360px] w-[360px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(240,223,174,0.85) 0%, rgba(236,235,232,0) 68%)" }}
        />
        <Mark size={104} className="relative" />
      </div>
      <div className="flex flex-col gap-3 border-t border-hairline bg-paper px-6 pb-9 pt-8 md:w-[440px] md:border md:p-10">
        <Link href="/" aria-label="Lumen website" className="w-fit transition-opacity hover:opacity-70">
          <Logo size={16} />
        </Link>
        <h1 className="mt-1 text-[34px] font-normal leading-[1.1] tracking-[-0.035em]">
          Your money, off the <i>public</i> record.
        </h1>
        <p className="mb-3 text-[15px] leading-relaxed text-ink-60">
          {stored
            ? "Welcome back. Sign in with the passkey on this device."
            : "Create a passkey to open your private account. No seed phrase, no password."}
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
        <div className="flex justify-center">
          <WalletSignIn onSignedIn={onSignedIn} disabled={busy} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-ink-45">
          <span className="h-px flex-1 bg-hairline" />
          or
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch("/api/demo", { method: "POST" });
            setBusy(false);
            onSignedIn();
          }}
          className="h-[52px] border border-hairline bg-mist font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
        >
          Try the demo
        </button>
        <p className="text-center text-xs text-ink-45">No passkey needed. Simulated balances, real quotes.</p>
        <p className="mt-2 text-center text-xs leading-relaxed text-ink-45">
          Lumen never sees your passkey&apos;s private key, and never holds your funds.
        </p>
      </div>
    </div>
  );
}
