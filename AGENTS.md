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

## Prisma 7 (NOT the Prisma you know)

Prisma 7 uses a **driver adapter** and a `prisma.config.ts` — it differs from v6:

- `prisma/schema.prisma`: generator `provider = "prisma-client"` (not `prisma-client-js`), `output = "../generated/prisma"`. The `datasource db` block has **only `provider = "sqlite"`** — no `url` (the URL comes from `prisma.config.ts`).
- `prisma.config.ts` defines `schema`, `migrations.path`, `migrations.seed`, and `datasource.url = env("DATABASE_URL")`.
- The client is generated to `generated/prisma/client`. **Import it via `@/generated/prisma/client`**, not the default `@prisma/client` path.
- **Always use the singleton** in `lib/prisma.ts` (`export const prisma`). It instantiates `PrismaClient({ adapter: new PrismaBetterSqlite3(...) })` and caches it on `globalThis` in dev to avoid exhausting connections during HMR. Do not `new PrismaClient()` elsewhere.
- DB file: `DATABASE_URL=file:./prisma/dev.db` (resolved from `process.cwd()`). There is also a stale `./dev.db` at the repo root — prefer the `prisma/` one referenced by `lib/prisma.ts`.

## Directory map

```
app/
  api/scan/route.ts            # ESP32 endpoint: lookup + auto-create, emits scan if device_id
  api/scans/stream/route.ts    # SSE stream (force-dynamic) consumed by the cashier
  cashier/page.tsx             # POS screen (uses components/cashier-pos.tsx)
  payment/page.tsx             # order summary ONLY — Stripe element not wired yet
  products/page.tsx            # product admin (components/products-table.tsx, client sorting)
  dashboard/page.tsx           # charts/stats (Recharts)
  layout.tsx, page.tsx         # root layout (Geist font, Toaster) + home with links
components/
  ui/                          # shadcn/ui — owned/generated (badge, button, card, dialog, input, separator, sonner, table, tabs)
  cashier-pos.tsx              # cashier screen logic
  cart.tsx                     # cart table
  products-table.tsx           # sortable products table
hooks/use-hydrated.ts          # SSR-safe hydration flag
lib/
  prisma.ts                    # Prisma client singleton (driver adapter)
  cart.ts                      # useCart() client-side cart (reducer + localStorage)
  scan-events.ts               # globalThis scan emitter (subscribeScan/emitScan)
  format.ts                    # formatTHB() via Intl.NumberFormat
  utils.ts                     # cn() — className merge (clsx + tailwind-merge), most-used util
prisma/  schema.prisma, seed.ts, migrations/   generated/  (client output — gitignored)
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
- **Two `dev.db` files** may exist (`./dev.db` and `prisma/dev.db`); `lib/prisma.ts` resolves `DATABASE_URL` from `process.cwd()`, so set `DATABASE_URL` explicitly to avoid ambiguity.
- **SSE broadcasts are in-memory** (a `globalThis` Set of listeners), so they only work within a single server process — fine for the local-lan demo, not for multi-instance deploys.
