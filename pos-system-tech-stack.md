# POS System — Tech Stack & Build Plan

> **Class:** Computer Hardware Design (Freshman Project)
> **Scope:** Software side (frontend + backend + database + dashboard)
> **Hardware (handled by teammate):** Smart barcode scanner using ESP32, sends data over WiFi

---

## 1. System Overview

```
[ESP32 Barcode Scanner] --WiFi/HTTP--> [Next.js API Routes] --> [SQLite DB]
                                              |  ^
                                              |  |
                                       [Stripe API] (real payments: card + PromptPay)
                                              |
                                              v
   [Web Dashboard + POS UI]  (same Next.js app, embedded Stripe Payment Element)
```

One **Next.js** app serves everything: the POS cashier screen, the dashboard, the API (receives ESP32 scans), and payment handling. This is simpler than running a separate backend.

> **Thailand context:** Currency is **THB** (`thb`). Stripe accepts **PromptPay** (national QR payment) plus cards. Register the Stripe account in **Thailand** for full PromptPay support.

---

## 2. Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Framework (full-stack)** | Next.js (App Router) | One codebase for UI + API routes |
| **Language** | TypeScript | Type safety, fewer runtime bugs |
| **Database** | SQLite | Zero setup — a single file, perfect for a demo |
| **ORM** | Prisma | Easy schema, migrations, and a visual DB browser (Prisma Studio) |
| **Payments** | Stripe (Payment Element) | Real payments: **cards + PromptPay (THB)**, embedded in-app UI |
| **Payment SDK** | `@stripe/react-stripe-js` + `@stripe/stripe-js` | Mounts the embedded Payment Element |
| **Styling** | Tailwind CSS | Fast, consistent UI without writing CSS |
| **UI components** | shadcn/ui (required) | Prebuilt Buttons, Tables, Cards, Dialogs, Inputs, Tabs |
| **Icons** | lucide-react | Icon set bundled with shadcn/ui |
| **Charts** | Recharts | Simple dashboard charts in React |
| **Code Editor** | VS Code | Standard, free |

> **No NestJS needed** — Next.js API Route Handlers replace it for this scope.

### shadcn/ui dependencies & conventions
- Init via CLI: `npx shadcn@latest init` → creates `components.json`, sets up `lib/utils.ts`, Tailwind theme tokens.
- Components live in `components/ui/` (generated, you own the code — copy-paste, not a black-box package).
- Core deps added by shadcn: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, Radix UI primitives.
- Add components on demand: `npx shadcn@latest add button card table dialog input tabs badge`.

---

## 3. Hardware ↔ Software Contract (API for ESP32)

The **only thing your teammate needs to know**. The ESP32 sends this request to a Next.js route:

```
POST http://<server-ip>:3000/api/scan
Content-Type: application/json

{
  "barcode": "8851003202017",
  "device_id": "esp32-scanner-01"
}
```

**Server responds:**
```json
{ "status": "ok", "product": "MAMA Instant Noodles", "price": 20.0, "currency": "THB" }
```

> HTTP POST is the most beginner-friendly option for the ESP32 (`HTTPClient` / `WiFiClientSecure` libraries). Alternative: MQTT.

---

## 4. Database Schema (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")   // file:./prisma/dev.db
}

model Product {
  id        Int      @id @default(autoincrement())
  barcode   String   @unique
  name      String
  price     Float
  stock     Int      @default(0)
  items     TransactionItem[]
}

model Transaction {
  id             Int      @id @default(autoincrement())
  total          Float
  status         String   @default("paid")   // paid | pending | failed
  stripePaymentId String?                     // from Stripe
  createdAt      DateTime @default(now())
  items          TransactionItem[]
}

model TransactionItem {
  id            Int  @id @default(autoincrement())
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  transactionId Int
  product       Product @relation(fields: [productId], references: [id])
  productId     Int
  quantity      Int
  subtotal      Float
}
```

---

## 5. Next.js API Routes (Route Handlers)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/scan` | ESP32 sends barcode → returns product info |
| GET | `/api/products` | List products (admin / cashier) |
| POST | `/api/products` | Add / edit a product |
| POST | `/api/payment-intent` | Create a **Stripe PaymentIntent** → returns `client_secret` for the embedded Payment Element |
| POST | `/api/webhooks/stripe` | Receive Stripe events → confirm payment, save transaction, decrement stock |
| GET | `/api/dashboard/stats` | Today's revenue (THB), items sold, low-stock alerts |

> The Payment Element is rendered client-side using the `client_secret` from `/api/payment-intent`. Payment methods (card, PromptPay) are configured in the Stripe Dashboard or via the `payment_method_types` / Dashboard Payment Element settings.

> **`/api/scan` auto-create behavior:** if the scanned barcode is not found, create a placeholder product (e.g. name `"Unknown <barcode>"`, price `0`, stock `0`) and return it so the cashier can edit the name/price on the spot. This means no manual product setup is required before scanning.

---

## 6. Payment Flow (Stripe — embedded Payment Element)

```
1. Cashier scans items → cart builds up (POS UI, shadcn Table)
2. Click "Pay" → POST /api/payment-intent (sends cart + total in THB)
3. Next.js creates a Stripe PaymentIntent, returns { clientSecret }
4. Frontend mounts <Elements><PaymentElement/></Elements> (embedded, not a redirect)
5. Customer picks card or PromptPay → enters details → confirmPayment()
   - Card: handled inline
   - PromptPay: shows a QR code to scan with a Thai banking app
6. On success → route to /payment/success
7. Stripe also calls /api/webhooks/stripe (the source of truth)
8. Webhook verifies signature → saves Transaction → decrements Product.stock
```

**Why a webhook?** The page can be closed or refreshed before `confirmPayment()` resolves — the webhook is the reliable confirmation. Always mark a sale "paid" only inside the webhook.

### Enabling PromptPay
- In **Stripe Dashboard → Settings → Payment methods**, enable **PromptPay** (Thailand).
- It then appears automatically inside the Payment Element alongside cards.
- Settles in **THB**; no dispute/chargeback support (typical for QR bank-transfer methods).

### Stripe test cards (for the demo)
| Card number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0027 6000 3184` | Requires 3DS auth |
| `4000 0000 0000 0002` | Declined (good to show error handling) |

> PromptPay can't be fully simulated in test mode the same way as cards — test the success path with a card, and demonstrate the real PromptPay QR in live mode with a small amount if desired.

> **Advanced (optional):** For a real card reader at the counter, use **Stripe Terminal**. More complex — skip for the first version.

---

## 7. Project Structure

```
pos-system/
├── prisma/
│   ├── schema.prisma
│   ├── dev.db                      # SQLite database file
│   └── seed.ts                     # (optional) demo products — products auto-create on first scan otherwise
├── app/
│   ├── api/
│   │   ├── scan/route.ts           # ESP32 endpoint
│   │   ├── products/route.ts
│   │   ├── payment-intent/route.ts # Create Stripe PaymentIntent → client_secret
│   │   ├── webhooks/stripe/route.ts
│   │   └── dashboard/stats/route.ts
│   ├── cashier/page.tsx            # POS UI: cart + "Pay" button
│   ├── payment/page.tsx            # Embedded Payment Element (card + PromptPay)
│   ├── payment/success/page.tsx    # Shown after confirmPayment() success
│   ├── dashboard/page.tsx          # Charts + stock + sales (Recharts)
│   └── products/page.tsx           # Manage products (shadcn Table + Dialog)
├── components/
│   ├── ui/                         # shadcn/ui generated components
│   ├── cart.tsx                    # Cart table component
│   └── checkout-form.tsx           # Wraps <Elements> + <PaymentElement/>
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── stripe.ts                   # Stripe SDK (server) + loadStripe (client)
│   └── utils.ts                    # cn() helper (created by shadcn init)
├── components.json                 # shadcn/ui config
├── .env                             # secrets (see below)
├── package.json
└── README.md
```

---

## 8. Environment Variables (`.env`)

```env
# Database
DATABASE_URL="file:./dev.db"

# Stripe — get these from https://dashboard.stripe.com (use Test mode)
# Register the Stripe account in THAILAND to enable PromptPay.
STRIPE_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"     # from `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (local) or dashboard (prod)

# Currency & locale
NEXT_PUBLIC_CURRENCY="thb"
NEXT_PUBLIC_LOCALE="th"

# Public URL of the app
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 9. Build Steps / Milestones

1. **Scaffold** — `npx create-next-app@latest` (TypeScript + Tailwind + App Router), then `npx shadcn@latest init`. Install Prisma, Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`), Recharts.
2. **Database** — Write `schema.prisma`, run `npx prisma migrate dev`. Products are **auto-created on first scan** (see `/api/scan`); seeding a few demo products is optional.
3. **ESP32 endpoint** — Build `/api/scan`, test with curl/Postman (simulate the scanner before hardware is ready).
4. **Hardware integration** — Give your teammate the API spec (Section 3); test with the real ESP32.
5. **POS cashier UI** — Cart that fills from scans, running total (THB), "Pay" button (shadcn Button/Table).
6. **Payments** — Build `/api/payment-intent` + embedded Payment Element; enable PromptPay in the Stripe Dashboard; wire the webhook; test the 3 test cards.
7. **Dashboard** — Revenue chart (THB), items-sold list, low-stock warnings (Recharts + shadcn).
8. **Polish** — Styling, error handling, demo prep.

---

## 10. Decisions (Confirmed)

- **UI components:** shadcn/ui — **required** (Buttons, Tables, Cards, Dialogs, Inputs, Tabs).
- **Payment UI:** **Embedded Stripe Payment Element** (in-app, themeable with Tailwind/shadcn — not a redirect).
- **Currency / region:** **THB**, Thailand — with **PromptPay** enabled alongside cards.

- **Deployment:** **Local laptop** (ESP32 reaches the app over LAN at `http://<laptop-LAN-ip>:3000`). SQLite is used directly as a file — no hosted DB needed.
- **Product catalog:** **Auto-create on first scan** — if a scanned barcode isn't in the DB, the `/api/scan` route creates a placeholder product (name `"Unknown <barcode>"`, editable later) so the sale can still proceed.

> Webhook note (local): run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`.

---

## 11. Quick Reference — Versions (2026)

| Tool | Stable Version |
|------|----------------|
| Next.js | 15.x |
| React | 19.x |
| Prisma | 6.x |
| Stripe Node SDK (`stripe`) | 17.x |
| `@stripe/react-stripe-js` | 3.x |
| `@stripe/stripe-js` | 5.x |
| shadcn/ui | latest (CLI) |
| Recharts | 2.x |
| Node.js | 20 LTS |
