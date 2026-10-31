# Lumen spikes

Four checks of the riskiest NEAR Intents assumptions behind Lumen, run before the hackathon (Oct 25–31). This is throwaway research code, not the app.

## Setup

```bash
npm install
npm run keygen      # creates .env with two throwaway EVM keys (Alice, Bob); prints addresses only
npm run check       # no keys, no money: lists Ondo tokens + public dry quote
```

Then put your partner key from https://partners.near-intents.org into `ONECLICK_JWT` in `.env`.

Every script runs **dry by default** (`LIVE=0`): quotes only, nothing moves. Set `LIVE=1` to execute on mainnet with real money.

## The four spikes

| # | Command | Proves | Needs |
|---|---|---|---|
| 1 | `npm run spike1`, then open http://localhost:5180 **in Chrome or Edge** | A passkey (P-256) can sign in to Confidential Intents | Nothing. No money |
| 2 | `npm run spike2` | A deposit lands in a confidential balance | Partner key, `REFUND_TO`, ~$40 USDC (LIVE) |
| 3 | `npm run spike3` | Private send: Alice's confidential USDC → Bob's | Partner key, Alice funded (LIVE) |
| 4 | `npm run spike4` | Confidential buy + sell of NVDAon (`ASSET=GLDon` etc. to switch) | Partner key, Alice funded (LIVE) |

Suggested order: `check` → `spike1` → dry `spike2/3/4` with the key → `LIVE=1 spike2` (fund Alice) → `LIVE=1 spike3` → `LIVE=1 spike4`.

For spike 2 with the default `ORIGIN_ASSET` (USDC on NEAR), send from a NEAR wallet and set `REFUND_TO` to that NEAR account. To deposit from another chain, change `ORIGIN_ASSET` to that chain's USDC id (see `/v0/tokens`) and `REFUND_TO` to your address there.

## Already verified (2026-10-25, no partner key)

- 1Click lists Ondo tokens behind `?ondoTokens=true`. NVDAon, TSLAon, AAPLon, QQQon and GLDon all have live prices.
- **Minimum trade is about $30.** NVDAon quotes failed with "No liquidity available" at $25 and below, and worked at $30. Defaults are `BUY_USD=30` and `DEPOSIT_USD=40`.
- EVM (`erc191`) sign-in → User-Session works without a partner key. Sessions last 900 s.
- Passkey (`webauthn`, P-256) sign-in works. A simulated assertion was accepted, and the server's signer id, challenge and key encoding match the contract's own test vectors. **Still to do:** a real passkey in Chrome or Edge. The in-app browser sandboxes the page, so WebAuthn isn't available there.
- `/v0/quote` accepts **only the partner key** (`X-API-Key`). The user session is for `/v0/account/*` only. Confidential quotes are refused without the partner key.

## Safety

- `.env`, `.passkey.json` and session files are gitignored. Scripts never print private keys or tokens.
- Keep Alice's balance small. The keys are throwaway.
