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
| Execute cash movements | Signed intents from the confidential balance | *(planned; each flow enabled only after a live mainnet test)* |
| Invest: browse and quote | Ondo Global Markets tokens via NEAR Intents 1Click; live prices and real dry-run buy/sell quotes | **Working** (preview only) |
| Invest: execute orders | Signed `swap_transfer` intents from the confidential balance | *(planned; enabled per asset only after a live mainnet test)* |
| Passkey sign-in | WebAuthn P-256 signs an empty intent; NEAR Intents returns a user session | **Working** (tested with a software authenticator; real device pending) |
| Read private balance | `/v0/account/balances` with the user session | **Working** |
| Activity | Transaction history from NEAR Intents (`/v0/account/history`); demo receipts in demo mode | **Working** (real history is invite-only at NEAR Intents, so real accounts see an explanation instead) |
| Signed statement | Balances and activity exported as JSON, signed by the account's passkey (WebAuthn P-256) | **Built** (real-device signing untested) |
| Demo mode | Simulated balance and activity in the browser; every flow uses real dry-run quotes | **Working** |

## What is private, and what isn't

| Layer | Visibility |
|---|---|
| Balances and transfers inside Confidential Intents | Hidden from the public. Trust assumption: TEE hardware and NEAR's permissioned validator set. Not zero-knowledge. |
| Deposits into and withdrawals out of Lumen | Public on their chains. Only the link between them is hidden. |
| Order details (asset, amount, recipient) | Seen by Lumen's server and the 1Click API when quoting. |
| Blurred balances in the app | A screen-privacy feature only, not cryptography. |

Ondo tokens give economic exposure to the underlying stock or fund. They are not direct share ownership, and gold tokens track gold funds, not physical gold. Not available to US persons.

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

## Try it as a judge

1. Open `/demo` (or click **Try the demo** on the landing page or sign-in screen). No passkey or funds needed. A black banner marks demo mode.
2. **Overview** shows a simulated net worth split between cash and investments. Click **Reveal balances** to un-blur.
3. **Invest → NVIDIA → Buy**, enter $30 or more. The quote comes live from NEAR Intents. Click **Simulate buying NVDA** and see the holding and receipt update.
4. **Cash → Send**, enter any account id (e.g. `0x055f2e87d74ffda9e7bc2646ba76a5938d75679b`) and an amount. Simulate it and see it in Recent activity.
5. **Exit demo** clears everything.

Outside demo mode, the same screens show real balances from NEAR Intents and say "Preview only" until each flow has passed a live mainnet test.

## Built with

Next.js, TypeScript, Tailwind CSS, NEAR Intents 1Click API, `@defuse-protocol/intents-sdk`. Code written with Claude Code.
