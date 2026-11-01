# Lumen

A private financial account on NEAR: hold dollars, pay people by username, and invest in tokenized stocks and gold, from one balance the public can't see.

Built for the NEAR Hackathon (Nov 1–14, 2026). Tracks: `privacy`, `realworld`, `defi`.

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
| Demo mode | Simulated balance with real dry-run quotes | *(planned)* |

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

Open `/app` and create a passkey (Chrome, Safari or Edge; passkeys need HTTPS or localhost).
`node scripts/sim-passkey.mjs http://localhost:3000` runs the whole sign-in with a software authenticator.

## Try it as a judge *(planned)*

## Built with

Next.js, TypeScript, Tailwind CSS, NEAR Intents 1Click API, `@defuse-protocol/intents-sdk`. Code written with Claude Code.
