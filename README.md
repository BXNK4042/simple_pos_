# Simple POS

A point-of-sale web app for a freshman **Computer Hardware Design** project. An ESP32 barcode scanner reads a product's barcode and sends it over WiFi to this app; the app looks up the product (or auto-creates it), pushes it to a cashier screen, and is being wired up to take real **Stripe payments in THB** (Thailand, with PromptPay QR support).

One **Next.js** app serves everything: the cashier UI, the admin/product pages, the dashboard, the API that receives ESP32 scans, and (eventually) payment handling.

```
[ESP32 Barcode Scanner] --WiFi/HTTP--> [Next.js API] --> [SQLite DB]
                                              |
                                 [POS Cashier UI]  (cart fills from scans)
                                              |
                                   [Payment]  (Stripe — in progress)
```

---

## Features

- **Scan-to-cart:** ESP32 scans arrive over HTTP and stream to every open cashier screen via Server-Sent Events.
- **Auto-create products:** a scanned barcode that isn't in the database is created as a placeholder (`"Unknown <barcode>"`, price 0) so the sale can still proceed — no manual catalog setup needed.
- **Cashier screen:** live cart, quantity adjust, running total in THB.
- **Product admin:** sortable table to edit names/prices/stock.
- **Dashboard:** revenue and sales charts (Recharts).
- **THB currency & Thai locale** throughout (`Intl.NumberFormat`).

---

## Tech stack

| Layer | Tool |
|-------|------|
| Framework (full-stack) | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | SQLite (single file) via `better-sqlite3` |
| ORM | Prisma 7 (driver adapter) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (`components/ui/`), `lucide-react` icons, `sonner` toasts |
| Charts | Recharts |
| Payments | Stripe SDKs (`stripe`, `@stripe/react-stripe-js`, `@stripe/stripe-js`) — *integration in progress* |
| Region | Thailand — THB currency, PromptPay support planned |

---

## Getting started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- An ESP32 (or any HTTP client) to act as the scanner for full testing — the endpoint works with `curl` too.

### Install & run

```bash
npm install                 # also runs `prisma generate` (postinstall)

# Create .env from the variables below (DATABASE_URL is all you need to start)
npx prisma migrate dev      # create the SQLite database + apply schema
npm run db:seed             # optional: load demo products

npm run dev                 # http://localhost:3000
```

### Environment variables (`.env`)

```env
# Database (SQLite file). Prefer the prisma/ path.
DATABASE_URL="file:./prisma/dev.db"

# Currency & locale (defaults shown)
NEXT_PUBLIC_CURRENCY="thb"
NEXT_PUBLIC_LOCALE="th"

# Stripe — needed once the payment integration is built (Test mode)
# Register the Stripe account in THAILAND to enable PromptPay.
# STRIPE_SECRET_KEY="sk_test_xxx"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
# STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

> The app runs fine without the Stripe keys — the payment page currently shows an order summary only.

---

## The ESP32 ↔ app contract

The **only thing the hardware needs to do** is send an HTTP POST when a barcode is scanned:

```http
POST http://<laptop-LAN-ip>:3000/api/scan
Content-Type: application/json

{
  "barcode": "8851003202017",
  "device_id": "esp32-scanner-01"
}
```

**Response:**
```json
{
  "status": "ok",
  "id": 12,
  "barcode": "8851003202017",
  "product": "MAMA Instant Noodles",
  "price": 20.0,
  "stock": 40,
  "currency": "THB"
}
```

- Scans that include a `device_id` are **broadcast to all cashier screens** over the `/api/scans/stream` Server-Sent Events stream.
- Scans **without** a `device_id` (e.g. a manual cashier lookup) are returned only in the HTTP response and are *not* broadcast.

You can test without hardware:

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"barcode":"8851003202017","device_id":"esp32-scanner-01"}'
```

---

## How it works (data flow)

1. **ESP32 scans** → `POST /api/scan`.
2. The route looks up the `Product` by barcode (auto-creates an `"Unknown <barcode>"` placeholder if missing).
3. If the scan came from hardware (`device_id` present), it's emitted on an in-process event bus (`lib/scan-events.ts`).
4. The cashier screen subscribes via `GET /api/scans/stream` (SSE, 15s keepalive ping) and **adds the item to the cart**.
5. The cart is **client-side** — a `useReducer` persisted to `localStorage` (`pos:cart`). Quantities are capped at stock.

---

## Project structure

```
app/
  api/scan/route.ts            # ESP32 endpoint: lookup + auto-create + emit
  api/scans/stream/route.ts    # SSE stream consumed by the cashier
  cashier/page.tsx             # POS screen
  payment/page.tsx             # order summary (Stripe element: in progress)
  products/page.tsx            # product admin (sortable table)
  dashboard/page.tsx           # charts & stats (Recharts)
  layout.tsx, page.tsx         # root layout (Geist font, Toaster) + home
components/
  ui/                          # shadcn/ui (owned/generated)
  cashier-pos.tsx              # cashier screen logic
  cart.tsx                     # cart table
  products-table.tsx           # sortable products table
hooks/use-hydrated.ts          # SSR-safe hydration flag for localStorage reads
lib/
  prisma.ts                    # Prisma client singleton (driver adapter)
  cart.ts                      # useCart() client-side cart
  scan-events.ts               # globalThis scan emitter (subscribeScan/emitScan)
  format.ts                    # formatTHB() via Intl.NumberFormat
  utils.ts                     # cn() class-name merge
prisma/  schema.prisma, seed.ts, migrations/
generated/                     # Prisma client output (gitignored)
```

---

## Commands

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint (flat config)
npm run db:seed      # seed demo products (tsx prisma/seed.ts)
npx tsc --noEmit     # type-check (no dedicated script)

npx prisma generate  # regenerate client after schema changes
npx prisma migrate dev   # create/apply a migration
npx prisma studio        # browse the DB in a UI
```

There is no test framework configured.

---

## Current state & roadmap

- ✅ ESP32 scan endpoint + auto-create products
- ✅ SSE broadcast to cashier screens
- ✅ Cashier cart (client-side, localStorage)
- ✅ Product admin + dashboard
- 🚧 **Stripe payments** — SDKs are installed but not yet wired up. The payment page currently shows an order summary only. Planned: `/api/payment-intent`, `/api/webhooks/stripe`, and the embedded Payment Element (card + PromptPay). `Transaction` / `TransactionItem` rows are not written by any flow yet.

> See `pos-system-tech-stack.md` for the original full plan, and `AGENTS.md` for engineering notes and gotchas.

---

## Notes

- This is a class project optimized for a **local-laptop deploy**: the ESP32 reaches the app over LAN at `http://<laptop-LAN-ip>:3000`. The SSE broadcast is in-process memory, so it works within a single server instance.
- Built with Prisma 7's driver-adapter pattern (`@prisma/adapter-better-sqlite3`) and a generated client at `generated/prisma`.