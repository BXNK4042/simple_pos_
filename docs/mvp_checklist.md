# ✅ MVP Checklist: Grocery Store POS System

> Verified against actual code. `[x]` = working end-to-end. `[ ]` with
> `_(partial …)_` = partly built but not meeting spec. `[ ]` alone = missing.

## 🛒 1. Product Management

- [x] Add products — `POST /api/products` + `NewProductDialog` (wired in `/products`, `/stock-in`, `/cashier`)
- [x] Edit products — `PUT /api/products/[id]` (owner-only) + `EditProductDialog`
- [x] Delete products — `DELETE /api/products/[id]` (owner-only; blocks if it has transactions)
- [x] Set product name — on create + edit
- [x] Set SKU (Stock Keeping Unit) — `Product.sku` (nullable), in create/edit forms
- [x] Set barcode (optional) — `Product.barcode` is `String? @unique`; optional in schema + forms
- [x] Assign product category — `Product.category` (nullable), in create/edit forms
- [x] Set selling price — on create + edit
- [x] Set cost price — `Product.costPrice` (default 0), in create/edit forms
- [x] Set initial stock quantity — `productCreateSchema.initialStock` (default 0), in create form
- [x] Enable/disable product availability — `Product.isActive` (default true), toggle in edit form

---

## 📦 2. Inventory Management

- [x] Add stock — `/stock-in` → `POST /api/stock-in` (owner-only)
- [x] Increase stock quantity — relative `increment` inside `prisma.$transaction` (concurrency-safe)
- [x] Decrease stock quantity — `/stock-in` page "Stock out" tab → `POST /api/stock-out` (owner-only, decrement clamped at 0)
- [x] Automatically deduct stock after a sale — shared `decrementStock` in both Stripe webhook and `/api/pay-cash` (clamped at 0, idempotent for webhook)
- [x] Display current stock levels — products table + dashboard low-stock widget
- [x] Low-stock alerts — `lib/inventory.ts` (`LOW_STOCK`), badges, dashboard widget

---

## 💵 3. Point of Sale (POS)

- [x] Search products — `ProductSearch` → `GET /api/products?q=`
- [x] Scan barcode — ESP32 `POST /api/scan` + SSE broadcast (gated on `device_id`)
- [x] Add items to cart — `useCart()` (client reducer + `localStorage` under `pos:cart`)
- [x] Update item quantity — capped at stock
- [x] Remove items from cart
- [x] Automatically calculate total
- [x] Cancel sale before payment

---

## 💳 4. Payment

- [x] Support cash payments — `POST /api/pay-cash` + `CashTenderedDialog` on `/payment`; finalises synchronously (status `paid`, `paymentMethod:"cash"`, `amountTendered` stored, stock decremented in the same `$transaction`)
- [x] Support QR code payments — PromptPay/QR via Stripe `automatic_payment_methods` (Stripe Payment Element); no bespoke QR UI
- [x] Calculate change — `tendered − total`, shown in dialog, on success page, and on receipt (cash only)
- [x] Record payment amount — `Transaction.total` (server-recomputed via shared `buildServerItems`)
- [x] Record transaction date and time — `Transaction.createdAt`
- [x] Mark transaction as "Paid" — Stripe webhook (card) or cash route (cash); client never marks paid

---

## 🧾 5. Receipt

- [x] Generate receipt number — `Transaction.id`
- [x] Display transaction date and time
- [x] Display purchased items
- [x] Display item quantities
- [x] Display unit prices — `Unit` column (`subtotal / qty`) on receipt + on success page
- [x] Display total amount
- [x] Display payment method — header line + Method column on list; CSV `payment_method` column
- [x] Print receipt — `PrintButton` + `@media print` CSS in `app/globals.css` (isolates `.print-receipt`, hides `.no-print` chrome)
- [x] Export receipt as PDF — browser "Save as PDF" via the print dialog (no PDF library; output is the cleaned print view). A one-click `.pdf` download button is intentionally not built.

---

## 📊 6. Sales Reports

- [x] Daily sales report — `/dashboard?from=YYYY-MM-DD` (single day = `from === to`); native `<input type="date">`
- [x] Sales report by date range — `/dashboard?from=&to=` + same filter on `/transactions` list and CSV export
- [x] Total number of transactions — dashboard KPI ("Paid orders", all-time)
- [x] Best-selling products — top-5 within the selected range (`lib/stats.ts`)
- [ ] Sales breakdown by payment method — `Transaction.paymentMethod` column now exists; aggregation UI not yet built (CSV export includes it)

---

## 👤 7. User Authentication & Roles

- [x] Login with username and password — credentials + JWT cookie (`pos_session`)
- [x] Create Admin account — seed from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [x] Create Cashier account — `/users` management (owner-only)
- [x] Role-based permissions — `requireRole` + `proxy.ts` (optimistic) + per-route `require*Response`
- [x] Record which user completed each sale — `cashierId` written on both card + cash payment; displayed on receipt, transactions list (Cashier column), and CSV

---

# 🎯 MVP Workflow

The system should support the following end-to-end workflow:

- [x] Add products
- [x] Restock inventory
- [x] Search or scan products
- [x] Add products to cart
- [x] Accept payment
- [x] Generate receipt
- [x] Automatically update inventory
- [x] View daily sales report

---

# 📌 Remaining follow-ups (post-MVP)

1. **Dashboard payment-method breakdown** — column exists; needs aggregation tiles/chart.
2. **One-click PDF download** — currently print-to-PDF via browser; add a dedicated `.pdf` export only if the browser flow is insufficient.
3. **Pending card PaymentIntent cleanup** — "Cancel" on `/payment` still leaves a `pending` Transaction + open Stripe PaymentIntent; no void endpoint.
4. **Stateless JWT revocation** — logout is cookie-only; a stolen JWT lives until its 1-day expiry.
