<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Simple POS — Agent Guide

A point-of-sale web app (Next.js 16 App Router + React 19 + TypeScript) for a freshman Computer Hardware Design project. An ESP32 barcode scanner posts barcodes over WiFi; the app looks up / auto-creates products, pushes them to a cashier screen, and takes Stripe payments in THB (Thailand, PromptPay via `automatic_payment_methods`).

> **`pos-system-tech-stack.md` is the *plan*, not the implementation.** Stripe payments, transactions, receipts, and a sales dashboard are now built; several planned pieces are still missing (notably **product CRUD, cash payments, and receipt PDF** — see "Current state" below). Verify against the actual code before assuming a route or feature exists.

## Commands

```bash
npm run dev        # Next.js dev server (http://localhost:3000)
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (flat config: eslint.config.mjs). No file args = lint everything.
npm run db:seed    # seed the database (tsx prisma/seed.ts)

# Type checking (no dedicated script — run manually):
npx tsc --noEmit

# Prisma (v7 — uses prisma.config.ts + driver adapter; see below):
npx prisma generate                       # regenerate client into generated/prisma
npx prisma migrate dev                    # create/apply a migration after editing schema.prisma
npx prisma studio                         # browse the DB
```

There is **no test framework** configured. `postinstall` runs `prisma generate`, so the `generated/` client is created on install.

## Tech stack

- **Framework:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5
- **Database:** SQLite via `better-sqlite3`, accessed through **Prisma 7** with a driver adapter (see Prisma section)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **UI:** shadcn/ui (owned components in `components/ui/`), `lucide-react` icons, `sonner` toasts
- **Charts:** Recharts
- **Payments:** Stripe (`stripe` server SDK in `lib/stripe.ts`, `@stripe/react-stripe-js` + `@stripe/stripe-js` client in `lib/stripe-client.ts`). THB via `automatic_payment_methods` (surfaces card + PromptPay/QR wallets if enabled in the Stripe dashboard). Cash payments are NOT implemented.
- **Currency/locale:** THB / `th` via `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` env vars (see `lib/format.ts`)

## Architecture & data flow (as actually implemented)

```
ESP32 scanner --HTTP POST--> /api/scan --prisma--> SQLite (Product lookup / auto-create)
                                |
                          emitScan() (only when device_id present)
                                |
                          globalThis emitter (lib/scan-events.ts)
                                |
            /api/scans/stream (Server-Sent Events, 15s ping) -- cashier client
                                |
                          subscribeScan() -> useCart().addItem()
                                |
                  Cart = client-side useReducer + localStorage ("pos:cart")
                                |
                      "Pay now" -> POST /api/payment-intent
                                |     (server recomputes totals from DB prices,
                                |      creates pending Transaction + TransactionItem,
                                |      creates Stripe PaymentIntent)
                                v
                /payment renders <CheckoutForm> (Stripe Elements) -> confirmPayment()
                                |     (client never marks "paid")
                                v
                /payment/success polls /api/payment-intent/status?tid=
                                |     (waits for the webhook, then clears the cart)
                                v
   Stripe --webhook--> /api/webhooks/stripe  (source of truth; idempotent)
                  payment_intent.succeeded  -> Transaction.status "paid" + stock decrement (clamped at 0)
                  payment_intent.payment_failed -> Transaction.status "failed"
```

Key points:
- **Scan endpoint** (`app/api/scan/route.ts`): looks up `Product` by `barcode`; if missing, auto-creates an `"Unknown <barcode>"` placeholder (price 0, stock 0). Responds with `{ status:"ok", id, barcode, product, price, stock, currency }`.
- **SSE broadcast is gated on `device_id`:** only hardware scans (with `device_id`) are pushed to all cashier clients via SSE. Manual cashier entries get the product back from the POST response and add to the cart locally — they are NOT broadcast.
- **Cart is client-side only** (`lib/cart.ts` `useCart()`): `useReducer` persisted to `localStorage` under `pos:cart`. There is no server-side cart persistence. Quantities cap at `stock`.
- **Hydration:** the cart reads `localStorage`, so it must wait for hydration. Use the `useHydrated()` hook (`hooks/use-hydrated.ts`) before rendering cart-dependent UI to avoid SSR mismatches.

## Payments & transactions (Stripe, THB)

The client cart is **never trusted for totals**. On "Pay now", `/api/payment-intent` recomputes every line from DB prices, guards quantity against the stock snapshot, then creates a Stripe PaymentIntent and a `Transaction` row together.

- **Server-trusted totals:** `app/api/payment-intent/route.ts` (`buildServerItems`) re-validates the cart against the DB before creating anything; client-supplied totals/prices are discarded.
- **Transaction lifecycle:** created `status:"pending"` in the payment-intent route; only `/api/webhooks/stripe` flips it to `"paid"` (on `payment_intent.succeeded`) or `"failed"`. The client **never** marks a sale paid — `/payment/success` *polls* `/api/payment-intent/status` (up to 10× @ 800ms) and only clears the cart once the webhook confirms.
- **Stock decrement happens in the webhook**, inside the same `prisma.$transaction` that flips status, clamped at 0 (`app/api/webhooks/stripe/route.ts`). It is **idempotent** (short-circuits if already `"paid"`), so Stripe retries are safe. There is no cash-payment path that decrements stock.
- **Webhook is Stripe-signed & unauthenticated.** Run locally with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`. The handler reads the **raw body** via `request.text()` (required for signature verification).
- **Receipts/transactions are owner-only:** `/transactions` (list + CSV export) and `/transactions/[id]` (receipt detail with `PrintButton`) call `requireRole("owner")`; `proxy.ts` blocks cashiers from those paths. A cashier therefore cannot view or print receipts today.
- **Cashier attribution is captured but unused:** `cashierId` is written on payment-intent creation (`Transaction.cashierId` FK to `User`), but the receipt/list UI never selects or displays it.

## Authentication (credentials + JWT cookie)

Email/password auth with two roles: **owner** (all pages) and **cashier** (only `/cashier` + the `/payment` flow).

- **Session:** stateless JWT (HS256 via `jose`) in an `httpOnly`, `sameSite=lax` cookie `pos_session`, 1-day expiry. `secure` is on only in production (local HTTP dev works). See `lib/session.ts` (`encrypt`/`decrypt`/`createSession`/`deleteSession`) and `lib/auth.ts` (DAL: `verifySession`, `getCurrentUser`, `requireRole`, plus route-handler helpers `requireSessionResponse`/`requireOwnerResponse`/`authorizeScan`).
- **Route protection:** `proxy.ts` (Next 16 **renamed `middleware` → `proxy`**) does *optimistic*, cookie-only redirects (logged-out → `/login`; cashier on an admin path → `/cashier`). It is **not** the only defense — every page calls `verifySession()`/`requireRole()` and every API route calls the `require*Response` helpers. The `proxy` matcher excludes `api`, static assets, and `/login`.
- **Mutations are route handlers, NOT server actions** (see the gotcha below — Prisma 7 breaks inside server actions here). Auth endpoints live under `app/api/auth/*` (`login`, `logout`, `change-password`, `change-email`, `users`, `reset-password`) and are called from client forms via `lib/auth-client.ts` (`postAuth`).
- **`/api/scan`** accepts **either** a valid session (cashier manual entry) **or** an `X-Device-Key` header matching `DEVICE_KEY` (ESP32 hardware) — see `authorizeScan`. The ESP32 must send that header.
- **`/api/webhooks/stripe`** stays unauthenticated (Stripe-signed).
- **Password hashing:** `bcrypt` (cost 10). Form validation: `lib/schemas.ts` (zod v4 — note `error:` param and `z.email()`).
- **Accounts:** seeded by `npm run db:seed` (owner from `ADMIN_EMAIL`/`ADMIN_PASSWORD`; a demo cashier). Owner manages cashiers in `/users`; a locked-out owner resets via `npm run db:reset-owner` (reads `ADMIN_PASSWORD`). Re-seeding never overwrites an existing password.
- **Env:** `AUTH_SECRET` (JWT signing), `DEVICE_KEY` (ESP32 shared secret), `ADMIN_EMAIL`/`ADMIN_PASSWORD`, optional `CASHIER_EMAIL`/`CASHIER_PASSWORD`. For Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`whsec_…` from `stripe listen`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL` (used for the `return_url` after 3DS/redirect in `components/checkout-form.tsx`).

## Prisma 7 (NOT the Prisma you know)

Prisma 7 uses a **driver adapter** and a `prisma.config.ts` — it differs from v6:

- `prisma/schema.prisma`: generator `provider = "prisma-client"` (not `prisma-client-js`), `output = "../generated/prisma"`. The `datasource db` block has **only `provider = "sqlite"`** — no `url` (the URL comes from `prisma.config.ts`).
- `prisma.config.ts` defines `schema`, `migrations.path`, `migrations.seed`, and `datasource.url = env("DATABASE_URL")`.
- The client is generated to `generated/prisma/client`. **Import it via `@/generated/prisma/client`**, not the default `@prisma/client` path.
- **Always use the singleton** in `lib/prisma.ts` (`export const prisma`). It instantiates `PrismaClient({ adapter: new PrismaBetterSqlite3(...) })` and caches it on `globalThis` in dev to avoid exhausting connections during HMR. Do not `new PrismaClient()` elsewhere.
- DB file: `DATABASE_URL=file:./dev.db` is resolved from `process.cwd()` → the **repo-root `./dev.db`** is the live one. The `prisma/dev.db` file is empty/stale — always set `DATABASE_URL` explicitly when running `prisma` CLI commands (e.g. `DATABASE_URL="file:$(pwd)/dev.db" npx prisma migrate dev`).

## Directory map

```
app/
  api/scan/route.ts            # ESP32 endpoint: lookup + auto-create, emits scan if device_id
  api/scans/stream/route.ts    # SSE stream (force-dynamic) consumed by the cashier
  api/payment-intent/route.ts  # POST: validate cart vs DB, create PaymentIntent + pending Transaction
  api/payment-intent/status/   # GET: polled by /payment/success to await webhook confirmation
  api/transactions/export/     # GET: CSV export of transactions (owner-only)
  api/auth/*/route.ts          # login, logout, change-password, change-email, users, reset-password
  api/webhooks/stripe/route.ts # Stripe-signed payment webhook (unauthenticated)
  cashier/page.tsx             # POS screen (uses components/cashier-pos.tsx)
  payment/page.tsx             # order summary + embedded Stripe Payment Element (CheckoutForm)
  payment/success/page.tsx     # polls status, clears cart only after webhook confirms
  products/page.tsx            # product admin (components/products-table.tsx, client sorting)
  transactions/page.tsx        # owner-only transactions list (filter/sort/paginate + CSV export)
  transactions/[id]/page.tsx   # owner-only receipt detail (PrintButton)
  dashboard/page.tsx           # charts/stats (Recharts) — owner-only, reads via Prisma directly
  login/, settings/, users/    # auth + owner account-management pages (client forms → /api/auth/*)
  layout.tsx, page.tsx         # root layout (Geist font, Toaster, SiteHeader) + home with links
proxy.ts                       # Next 16 "proxy" (née middleware) — optimistic auth redirects
components/
  ui/                          # shadcn/ui — owned/generated (badge, button, card, dialog, input, separator, sonner, table, tabs)
  cashier-pos.tsx              # cashier screen logic
  cart.tsx                     # cart table
  checkout-form.tsx            # Stripe Elements <PaymentElement> + confirmPayment()
  products-table.tsx           # sortable products table (search + stock badges; no edit/delete)
  transactions/                # filters, transactions-table, pagination, print-button
  dashboard/                   # kpis, revenue-chart, top-products, low-stock-table (Recharts)
  site-header.tsx              # name + role + sign-out (client; hidden when logged out)
hooks/use-hydrated.ts          # SSR-safe hydration flag
lib/
  prisma.ts                    # Prisma client singleton (driver adapter)
  stripe.ts                    # server Stripe singleton (THB, toStripeAmount)
  stripe-client.ts             # getStripeJs() publishable-key loader (client only)
  cart.ts                      # useCart() client-side cart (reducer + localStorage)
  scan-events.ts               # globalThis scan emitter (subscribeScan/emitScan)
  inventory.ts                 # LOW_STOCK threshold + isLow()/isOut() helpers
  transactions.ts              # query parsing (status/q/sort/dir/page), buildWhere, toCSV, stripeDashboardUrl
  session.ts                   # JWT encrypt/decrypt + create/deleteSession (jose)
  auth.ts                      # DAL: verifySession, getCurrentUser, requireRole, route-handler auth helpers
  schemas.ts                   # zod v4 schemas (login, createUser, change-password/email, reset-password)
  auth-client.ts               # postAuth() fetch helper for the client forms
  format.ts                    # formatTHB() + formatDateTime() via Intl
  utils.ts                     # cn() — className merge (clsx + tailwind-merge), most-used util
prisma/  schema.prisma, seed.ts, migrations/   scripts/reset-owner.ts   generated/  (client output — gitignored)
```

## Conventions

- **Class names:** always compose with `cn()` from `lib/utils.ts`. It is the most-connected util in the codebase.
- **UI components:** add via shadcn CLI (`npx shadcn@latest add <name>`) into `components/ui/`. You own that code — edit it directly; don't patch `node_modules`.
- **Server vs client:** route handlers are server code; anything touching `window`/`localStorage`/React state is `"use client"` (see `lib/cart.ts`, `hooks/use-hydrated.ts`, the pages that use them).
- **Money:** always render with `formatTHB(amount)`; never hard-code the ฿ symbol or currency string.
- **Imports:** use the `@/` path alias (configured in `tsconfig.json` and `components.json`).

## Current state / gotchas

- **Stripe payments are fully wired.** `/api/payment-intent` (creates PaymentIntent + pending `Transaction`/`TransactionItem` with server-trusted totals) and `/api/webhooks/stripe` (flips status to `paid`/`failed` and decrements stock, idempotently) both exist and work. `/payment` renders the embedded Stripe Payment Element via `components/checkout-form.tsx`; `/payment/success` polls until the webhook confirms. Still **not** built: cash payments, change calculation, and an explicit QR/PromptPay UI (QR surfaces only implicitly via `automatic_payment_methods` + Stripe dashboard config).
- **Product CRUD does not exist.** There is **no `/api/products/*`**, no add/edit/delete UI, and no `product.update`/`product.delete` anywhere. The `Product` schema (`prisma/schema.prisma`) has only `barcode, name, price, stock` — **no SKU, category, cost price, availability flag, or per-product min-stock**. Products enter the DB only via `app/api/scan/route.ts` (auto-creates `"Unknown <barcode>"` with price 0 / stock 0) or the seed script. Restocking/increasing stock is also impossible from the app — stock only enters via seed and leaves via the Stripe webhook.
- **No `/api/dashboard/stats` route** — the owner-only dashboard (`app/dashboard/page.tsx`) reads directly via Prisma in the server component and aggregates in JS (today's revenue, 7-day series, top-5 products all-time, low-stock list, paid-order count). There is no date-range filter and no payment-method breakdown (the `Transaction` model has no payment-method column, only `stripePaymentId`).
- **Receipts are owner-only and basic.** `/transactions/[id]` shows receipt number (= `Transaction.id`), date/time, items+qty+subtotal, total, and a Stripe dashboard link, with `PrintButton` (`window.print()`). Missing: unit-price column, payment-method display, `@media print` CSS (so printing dumps page chrome), and PDF export (no PDF library installed; only CSV list export exists at `/api/transactions/export`).
- **Two `dev.db` files** may exist (`./dev.db` and `prisma/dev.db`); `lib/prisma.ts` resolves `DATABASE_URL` from `process.cwd()`, so the **repo-root `./dev.db`** is the live one. Set `DATABASE_URL` explicitly to avoid ambiguity.
- **Server Actions + Prisma 7 are incompatible here.** A `'use server'` action whose module imports `prisma` fails with `Error: Connection closed.` (from `@prisma/query-plan-executor`) *before the action body runs*. All DB-touching mutations therefore use **route handlers** (which work fine). Do not migrate the auth (or any Prisma) mutations back to server actions.
- **Stateless JWT logout can't revoke a stolen token** — `logout` deletes the cookie browser-side, but a captured JWT stays valid until its 1-day expiry. Acceptable for the demo; add a DB-backed `disabled`/token-version check if you ever need instant revocation.
- **SSE broadcasts are in-memory** (a `globalThis` Set of listeners), so they only work within a single server process — fine for the local-lan demo, not for multi-instance deploys.
- **Cashier can't cancel a created PaymentIntent.** "Cancel" on `/payment` only clears local state; the `Transaction` row stays `"pending"` forever (only the webhook can finalise it). There is no transaction-void endpoint.
