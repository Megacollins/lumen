# Lumen

A private financial account on NEAR: hold dollars, send money privately, and invest in tokenized stocks and gold, from one balance the public can't see.

Built for the NEAR Hackathon (Nov 1–14, 2026). Tracks: `privacy`, `realworld`, `defi`.

**Live:** https://lumen-near.vercel.app · **Try the demo (no sign-up):** https://lumen-near.vercel.app/demo

> **Status: in development.** This README is updated as each part lands. Sections marked *(planned)* are not built yet.

## The problem

On a public blockchain, every payment, balance and trade is visible to anyone, forever. That rules out crypto for salaries, savings and investing for most people.

## What Lumen does

| Feature | How | Status |
|---|---|---|
| Private balance | NEAR Confidential Intents (private shard, TEE-secured) | **Working** (read live) |
| Add, send, move out, receive | USDC from/to NEAR, Base, Ethereum, Arbitrum, Solana; sends between Intents accounts | **Working** (real dry-run quotes, preview only) |
| Execute cash movements | Live quote → `/v0/generate-intent` (webauthn) → passkey signature → `/v0/submit-intent` → `/v0/status`; "Add money" returns a one-time deposit address | **Built, tested up to settlement** (a passkey-signed send was accepted by NEAR Intents mainnet and failed as expected on an empty account). Each flow opens only after a funded live test |
| Invest: browse and quote | Ondo Global Markets tokens via NEAR Intents 1Click; indicative prices from the token list and real dry-run buy/sell quotes | **Working** (preview only) |
| Invest: execute orders | Same pipeline, USDC ⇄ Ondo token between Intents balances | **Built, tested up to settlement** (a $30 NVDA buy was signed, accepted and tracked to FAILED on an empty account). Opens per asset after a funded live test |
| Passkey sign-in | WebAuthn P-256 signs an empty intent; NEAR Intents returns a user session | **Working** (tested on a real phone and with a software authenticator) |
| Wallet sign-in | "Use a wallet instead": EVM wallets (MetaMask and others, ERC-191 `personal_sign`) and NEAR wallets (Meteor, HOT, Intear, NEP-413 `signMessage`). The Lumen account is the wallet's own account, so its recovery phrase is the backup. Orders and statements are signed by the wallet | **Working** (EVM and NEAR sign-in and wallet-signed orders tested on mainnet with software wallets; named NEAR accounts register their key once with `intents.near add_public_key`, which is built but untested) |
| Read private balance | `/v0/account/balances` with the user session | **Working** |
| Activity | Transaction history from NEAR Intents (`/v0/account/history`); demo receipts in demo mode | **Working** (real history is invite-only at NEAR Intents, so real accounts see an explanation instead) |
| Signed statement | Balances and activity exported as JSON, signed by the account's passkey (WebAuthn P-256) | **Working** (tested on a real phone) |
| Demo mode | Simulated balance and activity in the browser; every flow uses real dry-run quotes | **Working** |
| Strategies | Invest → Strategies: investors publish model allocations across USDC and the Ondo assets; others browse, follow and copy them. Performance is the time-weighted return of the published allocation, chained across changes, computed only from prices Lumen records from the NEAR Intents token list from the moment of publishing (downloadable as CSV). Creators choose to share a holdings check (Lumen reads their confidential balance once with their own session and publishes only match/no-match within 5 points), a value range, and their account id. Followers get allocation updates in the app; "Copy allocation" splits an amount across the holdings and opens the normal buy sheet per asset, each with its own quote and signature | **Working** (tested end to end on the dev server against the real database and NEAR Intents: publish, holdings check, follow, update, unseen updates, unfollow, CSV, permissions). Buys follow the same preview lock as Invest |

## What is private, and what isn't

| Layer | Visibility |
|---|---|
| Balances and transfers inside Confidential Intents | Hidden from the public. Trust assumption: TEE hardware and NEAR's permissioned validator set. Not zero-knowledge. |
| Deposits into and withdrawals out of Lumen | Public on their chains. Only the link between them is hidden. |
| Order details (asset, amount, recipient) | Seen by Lumen's server and the 1Click API when quoting. |
| Blurred balances in the app | A screen-privacy feature only, not cryptography. |

Ondo tokens give economic exposure to the underlying stock or fund. They are not direct share ownership, and the gold token tracks SPDR Gold Shares (GLD), an ETF that holds gold, not physical gold. Not available to US persons.

## Repository layout

| Path | What |
|---|---|
| `web/` | The Next.js app (landing page and account) |
| `spikes/` | Scripts that verify each NEAR Intents integration against mainnet |
| `PLAN.md` | Build plan and feasibility findings |
| `DESIGN.md` | Design system |

## Run it

```bash
cd web
npm install
cp .env.example .env.local   # then set SESSION_SECRET (command in the file)
npm run dev                  # http://localhost:3000
```

Deploy: from `web/` (not the repo root), `vercel --prod`. `web/vercel.json` pins the Next.js preset; the root `.vercelignore` keeps any `.env` file out of uploads.

Open `/app` and create a passkey (Chrome, Safari or Edge; passkeys need HTTPS or localhost).
`node scripts/sim-passkey.mjs http://localhost:3000` runs the whole sign-in with a software authenticator.
`node scripts/sim-wallet.mjs http://localhost:3000 nep413|erc191 [order]` does the same with a software NEAR or EVM wallet.
`node scripts/sim-order.mjs http://localhost:3000 send|buy` runs a real order through the execution pipeline on mainnet with a fresh, empty account (start the dev server with `LUMEN_DEV_EXECUTION=1`; NEAR Intents should accept the signed intent and then mark it FAILED, since nothing is funded).

**Execution safety.** Real orders run only for flows that passed a funded mainnet test (`EXECUTION_VERIFIED`, `CASH_VERIFIED`) and only with Confidential Intents. The server re-quotes live, checks the balance before asking the passkey to sign (1Click intents stay valid for days), accepts only the exact payload it handed out within 5 minutes, refuses replays, and refuses intents for any other account. Before signing, the app shows the live quote and the full recipient for review; named NEAR recipients must exist, and USDC's own token contracts are refused as destinations. Orders placed from a browser are listed in Activity ("Your orders on this device"), bound to the account that placed them.

**Abuse protection.** Every API route has a per-IP rate limit and identical quotes share one NEAR Intents call for 5 seconds (in memory per server instance; a shared store would make the limit global). Security headers forbid framing (clickjacking) and restrict plugins, `<base>` and form targets; scripts and connections aren't restricted, because the NEAR wallet SDKs load from their own domains.

## Try it as a judge

1. Open `/demo` (or click **Try the demo** on the landing page or sign-in screen). No passkey or funds needed. A black banner marks demo mode.
2. **Overview** shows a simulated net worth split between cash and investments. Click **Reveal balances** to un-blur.
3. **Invest → NVIDIA → Buy**, enter $30 or more. The quote comes live from NEAR Intents. Click **Simulate buying NVDA** and see the holding and receipt update.
4. **Cash → Send**, enter any account id (e.g. `0x055f2e87d74ffda9e7bc2646ba76a5938d75679b`) and an amount. Simulate it and see it in Recent activity.
5. **Exit demo** clears everything.

Outside demo mode, the same screens show real balances from NEAR Intents and say "Preview only" until each flow has passed a live mainnet test.

## Known limitations

- **Geofence.** Tokenized stocks are blocked for US visitors by Vercel's IP-country header, and buyers confirm they aren't US persons (stored on their device). A VPN gets around both. A production launch would need proper KYC or an eligibility attestation.
- **Dependency advisories.** `npm audit` reports issues (one critical, in `protobufjs`) inside the NEAR Intents SDK's cross-chain bridge libraries, which Lumen uses only on the server. Several NEAR wallet SDKs carry advisories of their own; they load only when someone picks a NEAR wallet. The suggested `npm audit fix` downgrades major versions, so these are tracked rather than forced.
- **Rate limits** count per server instance (see Abuse protection).
- **Strategies: no history before publishing.** NEAR Intents' token list gives current prices only, so a track record starts at zero on the day a strategy is published and grows from Lumen's own snapshots (at least daily, plus every 30 minutes while someone is viewing). Returns are a model: no fees, slippage or the creator's actual fills.
- **Strategies: holdings checks rely on Lumen.** NEAR Intents has no viewing keys or delegated read access for developers yet (its selective disclosure is described, not exposed in the API), and transaction history is invite-only. So a check is Lumen's server reading the creator's balance with their session at that moment and recording the result, not a proof anyone can verify independently. Balances themselves are not stored.
- **Strategies: updates are in-app only.** Followers see new allocation changes when they open Strategies; there are no push or email notifications. Following never trades: there are no automated or batched orders.
- **Real wallets.** EVM and NEAR wallet sign-in and signing are tested with software wallets against mainnet; the one-time key registration for named NEAR accounts isn't tested yet.

## Built with

Next.js, TypeScript, Tailwind CSS, NEAR Intents 1Click API, `@defuse-protocol/intents-sdk`. Code written with Claude Code.
