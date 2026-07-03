<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Simple POS — Agent Guide

A point-of-sale web app (Next.js 16 App Router + React 19 + TypeScript) for a freshman Computer Hardware Design project. An ESP32 barcode scanner posts barcodes over WiFi; the app looks up / auto-creates products, pushes them to a cashier screen, and (eventually) takes Stripe payments in THB (Thailand, PromptPay).

> **`pos-system-tech-stack.md` is the *plan*, not the implementation.** Several planned pieces are not built yet (notably Stripe payments — see "Current state" below). Verify against the actual code before assuming a route or feature exists.

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
- **Payments:** Stripe SDKs are installed (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`) **but not yet integrated** (see Current state)
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
```

Key points:
- **Scan endpoint** (`app/api/scan/route.ts`): looks up `Product` by `barcode`; if missing, auto-creates an `"Unknown <barcode>"` placeholder (price 0, stock 0). Responds with `{ status:"ok", id, barcode, product, price, stock, currency }`.
- **SSE broadcast is gated on `device_id`:** only hardware scans (with `device_id`) are pushed to all cashier clients via SSE. Manual cashier entries get the product back from the POST response and add to the cart locally — they are NOT broadcast.
- **Cart is client-side only** (`lib/cart.ts` `useCart()`): `useReducer` persisted to `localStorage` under `pos:cart`. There is no server-side cart persistence. Quantities cap at `stock`.
- **Hydration:** the cart reads `localStorage`, so it must wait for hydration. Use the `useHydrated()` hook (`hooks/use-hydrated.ts`) before rendering cart-dependent UI to avoid SSR mismatches.

## Authentication (credentials + JWT cookie)

Email/password auth with two roles: **owner** (all pages) and **cashier** (only `/cashier` + the `/payment` flow).

- **Session:** stateless JWT (HS256 via `jose`) in an `httpOnly`, `sameSite=lax` cookie `pos_session`, 1-day expiry. `secure` is on only in production (local HTTP dev works). See `lib/session.ts` (`encrypt`/`decrypt`/`createSession`/`deleteSession`) and `lib/auth.ts` (DAL: `verifySession`, `getCurrentUser`, `requireRole`, plus route-handler helpers `requireSessionResponse`/`requireOwnerResponse`/`authorizeScan`).
- **Route protection:** `proxy.ts` (Next 16 **renamed `middleware` → `proxy`**) does *optimistic*, cookie-only redirects (logged-out → `/login`; cashier on an admin path → `/cashier`). It is **not** the only defense — every page calls `verifySession()`/`requireRole()` and every API route calls the `require*Response` helpers. The `proxy` matcher excludes `api`, static assets, and `/login`.
- **Mutations are route handlers, NOT server actions** (see the gotcha below — Prisma 7 breaks inside server actions here). Auth endpoints live under `app/api/auth/*` (`login`, `logout`, `change-password`, `change-email`, `users`, `reset-password`) and are called from client forms via `lib/auth-client.ts` (`postAuth`).
- **`/api/scan`** accepts **either** a valid session (cashier manual entry) **or** an `X-Device-Key` header matching `DEVICE_KEY` (ESP32 hardware) — see `authorizeScan`. The ESP32 must send that header.
- **`/api/webhooks/stripe`** stays unauthenticated (Stripe-signed).
- **Password hashing:** `bcrypt` (cost 10). Form validation: `lib/schemas.ts` (zod v4 — note `error:` param and `z.email()`).
- **Accounts:** seeded by `npm run db:seed` (owner from `ADMIN_EMAIL`/`ADMIN_PASSWORD`; a demo cashier). Owner manages cashiers in `/users`; a locked-out owner resets via `npm run db:reset-owner` (reads `ADMIN_PASSWORD`). Re-seeding never overwrites an existing password.
- **Env:** `AUTH_SECRET` (JWT signing), `DEVICE_KEY` (ESP32 shared secret), `ADMIN_EMAIL`/`ADMIN_PASSWORD`, optional `CASHIER_EMAIL`/`CASHIER_PASSWORD`.

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
  api/auth/*/route.ts          # login, logout, change-password, change-email, users, reset-password
  api/webhooks/stripe/route.ts # Stripe-signed payment webhook (unauthenticated)
  cashier/page.tsx             # POS screen (uses components/cashier-pos.tsx)
  payment/page.tsx             # order summary + embedded Stripe Payment Element
  products/page.tsx            # product admin (components/products-table.tsx, client sorting)
  dashboard/page.tsx           # charts/stats (Recharts)
  login/, settings/, users/    # auth + owner account-management pages (client forms → /api/auth/*)
  layout.tsx, page.tsx         # root layout (Geist font, Toaster, SiteHeader) + home with links
proxy.ts                       # Next 16 "proxy" (née middleware) — optimistic auth redirects
components/
  ui/                          # shadcn/ui — owned/generated (badge, button, card, dialog, input, separator, sonner, table, tabs)
  cashier-pos.tsx              # cashier screen logic
  cart.tsx                     # cart table
  products-table.tsx           # sortable products table
  site-header.tsx              # name + role + sign-out (client; hidden when logged out)
hooks/use-hydrated.ts          # SSR-safe hydration flag
lib/
  prisma.ts                    # Prisma client singleton (driver adapter)
  cart.ts                      # useCart() client-side cart (reducer + localStorage)
  scan-events.ts               # globalThis scan emitter (subscribeScan/emitScan)
  session.ts                   # JWT encrypt/decrypt + create/deleteSession (jose)
  auth.ts                      # DAL: verifySession, getCurrentUser, requireRole, route-handler auth helpers
  schemas.ts                   # zod v4 schemas (login, createUser, change-password/email, reset-password)
  auth-client.ts               # postAuth() fetch helper for the client forms
  format.ts                    # formatTHB() via Intl.NumberFormat
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

- **Stripe payments are a stub.** `app/payment/page.tsx` only shows an order summary ("Embedded Stripe Payment Element arrives in Milestone 6"). The planned `/api/payment-intent` and `/api/webhooks/stripe` routes **do not exist**, and `Transaction`/`TransactionItem` rows are not written by any flow yet. Treat the Stripe deps as unused until those are built.
- **No `/api/products`, `/api/dashboard/stats` routes exist** either — the products and dashboard pages read data another way (check the page before assuming an API).
- **Two `dev.db` files** may exist (`./dev.db` and `prisma/dev.db`); `lib/prisma.ts` resolves `DATABASE_URL` from `process.cwd()`, so the **repo-root `./dev.db`** is the live one. Set `DATABASE_URL` explicitly to avoid ambiguity.
- **Server Actions + Prisma 7 are incompatible here.** A `'use server'` action whose module imports `prisma` fails with `Error: Connection closed.` (from `@prisma/query-plan-executor`) *before the action body runs*. All DB-touching mutations therefore use **route handlers** (which work fine). Do not migrate the auth (or any Prisma) mutations back to server actions.
- **Stateless JWT logout can't revoke a stolen token** — `logout` deletes the cookie browser-side, but a captured JWT stays valid until its 1-day expiry. Acceptable for the demo; add a DB-backed `disabled`/token-version check if you ever need instant revocation.
- **SSE broadcasts are in-memory** (a `globalThis` Set of listeners), so they only work within a single server process — fine for the local-lan demo, not for multi-instance deploys.
