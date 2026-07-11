# ✅ MVP Checklist: Grocery Store POS System

> Updated against actual code. `[x]` = working end-to-end. `[ ]` with
> `_(partial …)_` = partly built but not meeting spec. `[ ]` alone = missing.

## 🛒 1. Product Management

- [x] Add products — `POST /api/products` + `NewProductDialog` (wired in `/stock-in`)
- [ ] Edit products — no PUT/PATCH route
- [ ] Delete products — no DELETE route
- [x] Set product name — set on create
- [ ] Set SKU (Stock Keeping Unit) — no `sku` field in `Product` schema
- [ ] Set barcode (optional) _(partial: barcode is required `@unique`, not optional)_
- [ ] Assign product category — no category field
- [x] Set selling price — set on create
- [ ] Set cost price — no `costPrice` field
- [ ] Set initial stock quantity _(partial: create hardcodes `stock: 0`; must stock-in after)_
- [ ] Enable/disable product availability — no availability flag

---

## 📦 2. Inventory Management

- [x] Add stock — `/stock-in` → `POST /api/stock-in`
- [x] Increase stock quantity — `POST /api/stock-in` (relative increment, tx-safe)
- [ ] Decrease stock quantity _(partial: only auto-deducted on sale; no manual decrease UI/route)_
- [x] Automatically deduct stock after a sale — Stripe webhook, clamped at 0
- [x] Display current stock levels — products table + dashboard
- [x] Low-stock alerts — `lib/inventory.ts`, badges, dashboard widget

---

## 💵 3. Point of Sale (POS)

- [x] Search products — `ProductSearch` → `GET /api/products?q=`
- [x] Scan barcode — ESP32 `POST /api/scan` + SSE broadcast
- [x] Add items to cart — `useCart()`
- [x] Update item quantity
- [x] Remove items from cart
- [x] Automatically calculate total
- [x] Cancel sale before payment

---

## 💳 4. Payment

- [ ] Support cash payments — Stripe-only; no cash path
- [ ] Support QR code payments _(partial: PromptPay/QR surfaces only implicitly via Stripe `automatic_payment_methods` if enabled in dashboard; no explicit QR UI)_
- [ ] Calculate change — N/A until cash exists
- [x] Record payment amount — `Transaction.total`
- [x] Record transaction date and time — `Transaction.createdAt`
- [x] Mark transaction as "Paid" — webhook flips status; client never marks paid

---

## 🧾 5. Receipt

- [x] Generate receipt number — `Transaction.id`
- [x] Display transaction date and time
- [x] Display purchased items
- [x] Display item quantities
- [ ] Display unit prices — only subtotal shown (`app/transactions/[id]/page.tsx`)
- [x] Display total amount
- [ ] Display payment method — schema has no method field, only `stripePaymentId`
- [ ] Print receipt _(partial: `PrintButton` = `window.print()`, but no `@media print` CSS → prints page chrome)_
- [ ] Export receipt as PDF — no PDF lib; only CSV list export exists

---

## 📊 6. Sales Reports

- [ ] Daily sales report _(partial: dashboard shows today's snapshot + fixed 7-day chart; can't pick an arbitrary day)_
- [ ] Sales report by date range — no date filter on dashboard/transactions
- [x] Total number of transactions — dashboard KPI
- [x] Best-selling products — top-5 all-time
- [ ] Sales breakdown by payment method — needs payment-method column

---

## 👤 7. User Authentication & Roles

- [x] Login with username and password — credentials + JWT cookie
- [x] Create Admin account — seed from `ADMIN_*`
- [x] Create Cashier account — `/users` management
- [x] Role-based permissions — `requireRole` + `proxy.ts`
- [ ] Record which user completed each sale _(partial: `cashierId` FK written on payment-intent, but never selected/displayed in receipt or list)_

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
- [ ] View daily sales report _(partial: today-only snapshot, no selectable day)_
