# ShiftSwap — campus shift marketplace (Paiflow hackathon)

A P2P campus shift-swapping and micro-job marketplace built on the Paiflow SDK starter. Working students post shifts they need covered with an XLM pay tier; idle students claim shifts, negotiate in chat, and the poster escrows the pay into an on-chain Paiflow flow when accepting a substitute.

The original fixed-1-XLM payment walkthrough is preserved at **`/pay`**.

## How the demo works

- **Data** lives entirely in the browser (`localStorage`) — no backend database. Seeded with demo profiles, shifts, claims, chat and ratings on first run; use **Reset demo data** on the feed to restore.
- **Two-tab demo**: the nav "Acting as" switcher picks which profile this browser tab is. Open a second tab as another profile to claim, chat and pay each other. Writes are Web-Lock-guarded and synced across tabs via `storage` events plus a 2-second chat poll.
- **Money flow**: when a poster accepts a claim, a payment panel appears — prepare → Freighter sign → submit → bounded confirmation, with the starter's full recovery semantics. Amounts are a server-side whitelist of tiers (1 / 2 / 5 / 10 XLM). The deposit routes per your deployment's configured recipients (e.g. worker payout + platform split); verify the split on the deployment's activity page — transaction confirmation alone is not payout verification.
- **Escrow state**: a confirmed escrow moves the shift to `escrowed`; a failed one reopens it. Either party marks the shift complete, then both can rate each other.

### Demo script for judges

1. Open http://localhost:3000 (redirects to the feed). Tab 1: act as **Maya Chen**; Tab 2: act as **Dev Okafor**.
2. Dev claims an open shift (e.g. *Café morning rush cover*) — both sides can now chat.
3. Maya accepts the claim; the escrow panel appears. Connect Freighter (testnet, funded wallet), prepare the tier amount, sign, submit, and watch the bounded confirmation resolve `SUCCESS`.
4. The shift shows `escrowed` with its transaction hash. Open the linked deployment page to show the Percentage Split paying out.
5. Either party marks it complete; both rate each other. Dev's profile shows earned XLM.

## Run locally

Requires **Node `>=22.22.2 <23`** and **pnpm `10.4.1`**.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local   # fill in PAIFLOW_DEPLOYMENT_ID and PAIFLOW_API_TOKEN
pnpm dev
```

Never use `NEXT_PUBLIC_` for Paiflow settings or commit `.env.local`.

## Configure your deployment

1. In Paiflow, build and deploy an **On Receive (native XLM)** flow with your chosen recipients and rules (e.g. a percentage split: worker payout + platform fee). Wait for confirmation. This app does not create or deploy flows.
2. In **Account → Developer**, create a **Read and operate** token explicitly granted to that deployment, or use a deployment-bound `pfk_` token.
3. Set `PAIFLOW_BASE_URL`, `PAIFLOW_DEPLOYMENT_ID` and `PAIFLOW_API_TOKEN` in `.env.local`, then restart.

## Try a payment

See the original starter walkthrough at **`/pay`** — the escrow panel on a shift detail page runs the identical lifecycle (prepare → sign → submit → confirm → recover), just with a whitelisted per-shift amount and a per-shift recovery record. Recovery evidence is kept until acknowledged; manual retry sends only the exact saved envelope; expiry or `UNKNOWN` never authorizes a replacement.

## Code map

| File | Responsibility |
| ---- | -------------- |
| `lib/paiflow.ts` | Server-only configuration, tier whitelist, typed SDK payment calls |
| `lib/pay-request.ts` | Narrow request validation for `/api/pay` |
| `app/api/pay/route.ts` | Allowlisted prepare (with amount) / submit / status actions |
| `lib/market/` | Types, seed, Web-Lock-guarded localStorage store, React bindings |
| `lib/use-payment.ts` | Extracted payment lifecycle hook (Web Locks, recovery, confirmation) |
| `components/payment-panel.tsx` | Reusable prepare → sign → submit → recover panel |
| `components/shift-feed.tsx`, `post-shift-form.tsx`, `shift-detail.tsx`, `chat-thread.tsx`, `profile-view.tsx`, `nav.tsx` | Marketplace UI |
| `lib/recovery.ts` | Original transaction evidence; scope-aware conflict checks (per-shift escrows allowed) |
| `lib/wallet.ts` | Freighter connection and signing |
| `app/pay/page.tsx` + `components/starter-app.tsx` | Original 1 XLM starter demo, unchanged in behavior |

## Checks and evidence

```sh
pnpm typecheck
pnpm test
pnpm build
node scripts/check-browser-bundle.mjs
```

Tests use fixtures and mocked upstream responses. Complete a small authorized testnet rehearsal against your deployment before demonstrating it.

