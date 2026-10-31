# Lumen — Build Plan (v2, Confidential Intents)

NEAR Hackathon, Nov 1–14, 2026. Revised 2026-10-25 after verifying the NEAR Intents 1Click API.

> **Pitch:** Lumen is a private account on NEAR where you can hold, send and invest money (dollars, stocks and gold) without putting your finances on public display.
>
> Hero line: **"Private money. Private markets."**

---

## 0. Hackathon facts (nearhackathon.com, read 2026-10-25)

| Fact | Value |
|---|---|
| Development | 2026-11-01 00:00 UTC → 2026-11-14 23:59 UTC |
| Judging / results | Nov 16–18 |
| Prizes (paid in NEAR) | Grand prize $55K; per track $10K / $3K / $2K; 13 tracks |
| Submit | One form per team: public repo link + public X demo post (video or screenshots, saying it was built at NEAR HACKATHON) + NEAR mainnet payout account. **Cannot be edited** after sending |
| Judges | Illia Polosukhin, Eddy Lazzarin, Mert Mumtaz, Avichal Garg, Kain Warwick, Haseeb Qureshi, Stepan Gershuni, **plus Claude Code & Codex as AI judges** |
| Criteria (from past NEAR hackathons) | Technical implementation, design, impact, originality, sustainability |
| Pre-existing code | No rule stated. Repo may be private while building; must be public by the deadline |
| Live rules | https://nearhackathon.com/HACKATHON.md — re-read before submitting |

**Tracks to select** (multi-track allowed, still one submission):

| Track id | Why Lumen fits | Organizers' hints |
|---|---|---|
| `privacy` (primary) | Private finance on Confidential Intents | PRIVATE AI, **TEE**, NEAR AI CLOUD |
| `realworld` | Stablecoin cash + username payments | STABLECOINS, NEAR INTENTS |
| `defi` | Trading of Ondo assets through Intents | TRADING, NEAR INTENTS |

The privacy track explicitly names TEE. That makes the honest "confidential, TEE-based" wording a strength, not a caveat: say it proudly in the README.

**What this changes in the build:**
1. **README written for AI judges.** What it is, the problem, the architecture, and how to try it as "do X → see Y" steps. No marketing. Name the NEAR features used: Confidential Intents, 1Click, webauthn intent signing, Ondo via Intents.
2. **Demo mode.** Judges won't fund a mainnet account. Add a "Try the demo" path with a seeded, simulated balance that runs every flow against dry quotes (`dry: true`, real prices). Label it clearly. The X video shows the real mainnet run.
3. **Optional AI angle for the privacy track.** An "Ask Lumen" private portfolio assistant on NEAR AI Cloud (TEE inference), so your finances never reach a public AI. Nice-to-have only; build it on day 12 if the core is done.

---

## 1. What changed from v1

| v1 | v2 |
|---|---|
| Custom shielded pool contract (Rust) + Circom circuit + in-browser proving | **Removed.** Privacy comes from **Confidential Intents** (live on NEAR mainnet) |
| Relayer that unshields → swaps → reshields | **Removed.** Confidential balances swap directly via 1Click with `CONFIDENTIAL_INTENTS` deposit/recipient types |
| Ondo availability unknown, mock-token fallback | **Verified live:** 28 Ondo tokens via `GET /v0/tokens?ondoTokens=true` |
| Passkey auth via an unknown provider | **Native:** Intents verifies `webauthn` signatures (P-256 and Ed25519) |
| Testnet | **Mainnet only** (no Confidential Intents testnet found). Demo with $5–20 |
| Viewing keys (ZK) | **Signed statements**, self-attested (see §6) |

Net: about 5 days of cryptography move to product polish.

---

## 2. Architecture

```
Browser (Next.js client)
 ├─ Passkey (WebAuthn) / NEAR wallet (nep413) / EVM wallet (erc191)  ← signs intents, keys never leave the device
 └─ calls Lumen API only

Lumen API (Next.js route handlers on Vercel)
 ├─ holds PARTNER JWT (env var, never sent to the client)
 ├─ /api/session    → 1Click /v0/auth/authenticate, /v0/auth/refresh  (user-session token in httpOnly cookie)
 ├─ /api/balances   → 1Click /v0/account/balances
 ├─ /api/quote      → 1Click /v0/quote (confidentiality: "basic")
 ├─ /api/intent     → 1Click /v0/generate-intent → client signs → /v0/submit-intent
 ├─ /api/status     → 1Click /v0/status
 ├─ /api/markets    → 1Click /v0/tokens?ondoTokens=true (cached 30s)
 └─ /api/users      → username registry (Postgres)

Neon Postgres
 ├─ users(username, signer_id, standard, created_at)
 └─ receipts(signer_id, kind, asset_in, asset_out, amount_in, amount_out, intent_hash, status, created_at)
```

**Principles**
- Non-custodial: Lumen never holds keys or funds. It assembles requests; the user signs.
- The partner JWT stays server-side. User-session tokens live in httpOnly cookies.
- Confidential intents **must** go through `generate-intent` → sign → `submit-intent` (there is no RPC path).

### 1Click reference

| Thing | Value |
|---|---|
| Base URL | `https://1click.chaindefuser.com` |
| Partner key | partners.near-intents.org → send as `X-API-Key` |
| Fees | Unauthenticated +0.25%; partner ~0.20%, ~0.01% on stablecoin / same-asset routes |
| USDC (NEAR) | `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` |
| NVDAon | `nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near` |
| TSLAon | `nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near` |
| AAPLon | `nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near` |
| QQQon | `nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near` |
| GLDon | `nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near` |
| Signing standards | `nep413`, `erc191`, `raw_ed25519`, `webauthn`, `ton_connect`, `sep53`, `tip191` |

Observed 2026-10-25 (Sunday): $50 USDC → $49.58 NVDAon (public quote). Delivery to an Intents account was estimated at ~30 min; to a BNB Chain address, 38 s.

---

## 3. Core flows (mapped to API calls)

All quotes use `confidentiality: "basic"` and `slippageTolerance: 100` (1%) unless noted.

**A. Onboard**
1. Click "Continue with passkey" → `navigator.credentials.create()` (P-256).
2. Derive `signer_id` = `0x` + last 20 bytes of `keccak256("p256" ‖ pubkey)`.
3. Sign an empty intent → `/api/session` → user-session token.
4. Pick a username → `users` row. Land on Home at $0.00.
   - Alternatives: NEAR wallet (`nep413`; needs `add_public_key` on `intents.near` first), EVM wallet (`erc191`).

**B. Add money**
1. Quote USDC → USDC: `depositType: ORIGIN_CHAIN`, `recipient: signer_id`, `recipientType: CONFIDENTIAL_INTENTS`.
2. Show `depositAddress` + QR. The user sends USDC from a wallet or exchange.
3. Poll `/v0/status` → *Received → Making private → Ready*.

**C. Send privately** ⚠ verify on day 0
1. Resolve `@username` → `signer_id`.
2. Quote USDC → USDC: `depositType: CONFIDENTIAL_INTENTS`, `recipient: <their signer_id>`, `recipientType: CONFIDENTIAL_INTENTS`.
3. `generate-intent` (`type: swap_transfer`) → passkey signs → `submit-intent` → receipt.

**D. Buy an asset**
1. Quote USDC → NVDAon, with both sides `CONFIDENTIAL_INTENTS`. Show estimated shares, fee and a 30 s countdown.
2. Sign → submit → *Quoting → Filled → Private*.

**E. Sell:** same as D, NVDAon → USDC.

**F. Move out**
- Quote with `recipientType: DESTINATION_CHAIN` (any chain/address).
- Copy: "This leaves your private balance. The receiving address will be public."

**G. Statement (disclosure)**
- Generate a JSON/PDF of balances and receipts for a date range.
- The user signs its hash with their key, so a third party can check it came from the account owner.
- It is self-attested, and the UI says so.

---

## 4. Honest privacy language

Confidential Intents runs on a private NEAR shard, operated by a permissioned validator set and bridged through TEEs (trusted hardware). It is **not** zero-knowledge. Copy rules:

- **Use:** "confidential", "private from the public", "only you can see your balance".
- **Never use:** "anonymous", "untraceable", "zero-knowledge", "mixer".
- **Security page, plainly:** "Lumen uses NEAR Confidential Intents. Your transactions are processed on a private NEAR shard run by approved validators using secure hardware. Deposits and withdrawals can't be linked publicly. Lumen never holds your keys or your money."

---

## 5. Compliance

- **Geofence:** block US persons using Vercel's `x-vercel-ip-country` header on the Markets routes; Cash stays available. Add a self-certification checkbox before the first buy: "I'm not a US person…".
- **Footer risk disclosure:** "Tokenized stocks are issued by Ondo Global Markets and are not available to US persons. Not investment advice."
- **Professional-investor notice** where applicable (UK, CH, SG).

---

## 6. Screens (unchanged from v1)

```
Landing (/)
App (/app)
├── Home        veiled net worth · cash vs. assets · Add / Send / Invest · recent activity
├── Markets     5 assets (NVDA, TSLA, AAPL, QQQ, Gold) → Asset detail → Buy/Sell sheet
├── Portfolio   allocation ring · positions · cash · P&L
├── Activity    receipts from Lumen's own log (1Click history is invite-only)
└── Account     username · passkeys · Statements · Move out · Security & privacy · legal
```

- Mobile: bottom tabs. Desktop: left rail plus a 720px column.
- Sheets: Add · Send · Buy/Sell · Move out · Receipt.

---

## 7. Design system — superseded by DESIGN.md

> Measured from o.cash on 2026-10-25. The real system uses **square corners, no shadows, a grey `#F5F5F5` page and minimal motion**. Use [DESIGN.md](DESIGN.md); the table below is the old v1 guess, kept for reference.

| Area | Values |
|---|---|
| Colours | `--bg #FBFBF9` · `--surface #FFF` · `--surface-2 #F4F3EF` · `--ink #141413` · `--ink-2 #5C5B57` · `--ink-3 #9A9893` · `--line #E8E6E1` · `--accent #C9A24A` (rare) · `--up #2F7D5B` · `--down #B5523B` |
| Type | Geist / Inter Tight, weight 500 headings at -0.02em, tabular numerals. Scale: 64/40/24/17/15/13 |
| Spacing | 4px base; sections 160px desktop / 96px mobile; 16px mobile gutter; content max 1120px |
| Radius | 12 inputs, 20 cards, pill buttons |
| Shadow | `0 1px 2px rgba(20,20,19,.04), 0 8px 24px rgba(20,20,19,.06)` |
| Motion | 160–240ms UI, 400–600ms reveals, `cubic-bezier(.2,.8,.2,1)`; blur-to-sharp reveal; numbers roll; respect reduced motion |
| Signature | The **privacy veil** — balances blurred until tap/hold |

Landing order: Nav → Hero → Philosophy → How it works (Add · Send · Invest) → Markets board → What you can do → Who it's for → "Private, not hidden" → FAQ → Closing CTA → Footer.

---

## 8. Scope

**Must-have**
1. Landing page (Hero, How it works, Markets, Trust, CTA polished)
2. Passkey onboarding + NEAR wallet fallback
3. Add money into a confidential balance
4. Private send by username
5. Buy/sell 5 Ondo assets confidentially
6. Home + Portfolio with the veil, live prices
7. Activity + receipts
8. Statement export
9. Geofence + disclosures
10. Mobile-first polish, empty/loading/error states
11. Demo mode (simulated balance, dry quotes) for judges
12. Judge-ready README + public repo + X demo post

**Nice-to-have**
- "Ask Lumen" private assistant on NEAR AI Cloud (privacy-track bonus)
- Deposits from any chain (BTC, SOL, ETH) — the same quote flow with a different origin asset
- Price history charts
- Dark mode
- Contacts, payment notes
- Recurring buys

---

## 9. Pre-hackathon checklist (Oct 25–31)

Research and verification only; check the hackathon rules on pre-written code.

- [x] Read the hackathon rules (see §0)
- [ ] Create the NEAR mainnet account for the prize payout (you, in any NEAR wallet)
- [ ] Join the NEAR Discord; ask whether pre-hackathon spike scripts are fine to reuse
- [ ] Get a partner JWT from partners.near-intents.org
- [ ] Ask NEAR / Intents team for confidential-history access (`/v0/account/history` is invite-only)
- [ ] **Spike 1:** passkey `webauthn` signer → `/v0/auth/authenticate` succeeds. Does the account need registration?
- [ ] **Spike 2:** $5 USDC deposit into a confidential balance; `/v0/account/balances` shows it
- [ ] **Spike 3:** confidential USDC → USDC to a second account (private send). **Biggest risk**
- [ ] **Spike 4:** confidential USDC → NVDAon and back; note fill time on a weekday vs. a weekend
- [x] Spike scripts written: `lumen/spikes/` (see its README)
- [x] EVM and passkey (simulated) sign-in → User-Session verified, no partner key needed
- [ ] Minimum Ondo trade looks like ~$30 (NVDAon, Sunday). Re-check on a weekday; the Buy sheet needs a minimum-amount state
- [ ] Note: `/v0/quote` accepts only the partner key; the user session is only for `/v0/account/*`. Lumen's server must hold the partner key for every quote
- [ ] Pick fonts, set up the Figma frames for Home, Buy sheet and Landing hero

**If Spike 3 fails:** make Send an external payment — a confidential balance paying out to any address. Copy: "Pay anyone, privately funded."

---

## 10. Schedule (Nov 1–14)

| Day | Work |
|---|---|
| 1 | Repo, Next.js + Tailwind tokens, components (Button, Card, Sheet, NumberPad, Veil, AmountRoll) |
| 2–3 | Landing page complete |
| 3–4 | Passkey onboarding, session, username registry |
| 5 | Add money + status tracking |
| 6–7 | Send + receipts + Activity |
| 8–9 | Markets, asset detail, Buy/Sell |
| 10 | Home + Portfolio, live prices, veil |
| 11 | Statements, geofence, disclosures, Security page, demo mode |
| 12 | Motion pass, mobile QA, error states; "Ask Lumen" if time allows |
| 13 | Judge-ready README, record the video (real mainnet run), publish the X post |
| 14 | Make the repo public, submit the form (well before 23:59 UTC), buffer |

---

## 11. Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) · TypeScript · Tailwind v4 · Radix UI · Motion · Lenis (landing only) |
| Intents | `@defuse-protocol/intents-sdk` where it helps; otherwise direct `fetch` to 1Click |
| Wallets | `@simplewebauthn/browser` (passkeys) · `@near-wallet-selector` (NEAR) · viem (EVM signing, optional) |
| Data | Neon Postgres via Drizzle |
| Hosting | Vercel |
| Charts | Custom SVG sparklines |
