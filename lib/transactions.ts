import type { Prisma } from "@/generated/prisma/client"

export const PAGE_SIZE = 25

export type TxnStatus = "paid" | "pending" | "failed"
export type StatusFilter = "all" | TxnStatus
export type SortKey = "date" | "total" | "status"
export type Dir = "asc" | "desc"

export type ParsedQuery = {
  status: StatusFilter
  q: string
  sort: SortKey
  dir: Dir
  page: number
  from: string
  to: string
}

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
]

export const STATUS_BADGE_VARIANT: Record<
  TxnStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  paid: "success",
  pending: "warning",
  failed: "destructive",
}

const VALID_STATUS: StatusFilter[] = ["all", "paid", "pending", "failed"]
const VALID_SORT: SortKey[] = ["date", "total", "status"]
const DAY_MS = 24 * 60 * 60 * 1000

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/**
 * Validates a `YYYY-MM-DD` searchParam. Returns "" for empty/invalid. Only the
 * strict shape is accepted so we never feed Prisma a malformed bound. Used for
 * both the dashboard range and the transactions list filter.
 */
function normalizeDay(value: string | undefined): string {
  if (!value) return ""
  const parts = value.split("-").map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ""
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return ""
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/** Converts a validated YYYY-MM-DD to a [startOfDay, startOfNextDay) Date pair. */
export function dayBounds(value: string): { gte: Date; lt: Date } | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  const gte = new Date(y, m - 1, d, 0, 0, 0, 0)
  const lt = new Date(gte.getTime() + DAY_MS)
  return { gte, lt }
}

/** Parse + validate the raw searchParams object into a known-good query. */
export function parseQuery(
  params: Record<string, string | string[] | undefined>
): ParsedQuery {
  const status = first(params.status)
  const sort = first(params.sort)
  const dir = first(params.dir)
  const q = first(params.q) ?? ""
  const page = Number(first(params.page) ?? "1")
  const from = normalizeDay(first(params.from))
  const to = normalizeDay(first(params.to))

  return {
    status: VALID_STATUS.includes(status as StatusFilter) ? (status as StatusFilter) : "all",
    q: q.trim(),
    sort: VALID_SORT.includes(sort as SortKey) ? (sort as SortKey) : "date",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    from,
    to,
  }
}

/** Builds the Prisma WHERE from status filter, date range, and OR search. */
export function buildWhere({
  status,
  q,
  from,
  to,
}: {
  status: StatusFilter
  q: string
  from?: string
  to?: string
}): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {}
  if (status !== "all") where.status = status

  // Date range: `from` is inclusive start-of-day; `to` is inclusive end-of-day
  // (i.e. exclusive start-of-next-day). Both optional; either may be set alone.
  const fromBounds = dayBounds(from ?? "")
  const toBounds = dayBounds(to ?? "")
  if (fromBounds || toBounds) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (fromBounds) createdAt.gte = fromBounds.gte
    if (toBounds) createdAt.lt = toBounds.lt
    where.createdAt = createdAt
  }

  const trimmed = q.trim()
  if (trimmed) {
    const numericId = Number(trimmed)
    const or: Prisma.TransactionWhereInput[] = [
      { stripePaymentId: { contains: trimmed } },
      { items: { some: { product: { name: { contains: trimmed } } } } },
    ]
    // Only match by numeric id when the query parses as a finite number.
    if (Number.isFinite(numericId)) {
      or.push({ id: numericId })
    }
    where.OR = or
  }

  return where
}

export function buildOrderBy({
  sort,
  dir,
}: {
  sort: SortKey
  dir: Dir
}): Prisma.TransactionOrderByWithRelationInput {
  const field = sort === "date" ? "createdAt" : sort
  return { [field]: dir } as Prisma.TransactionOrderByWithRelationInput
}

export function totalPages(totalCount: number): number {
  return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
}

/**
 * Builds a normalized `/transactions?…` href from the current query + overrides.
 * Default values (status=all, sort=date dir=desc, page=1) are omitted so URLs
 * stay clean. Set `resetPage` when changing status/q/sort.
 */
export function buildHref(
  query: ParsedQuery,
  overrides: Partial<ParsedQuery> = {},
  { resetPage = false }: { resetPage?: boolean } = {}
): string {
  const next = { ...query, ...overrides }
  if (resetPage) next.page = 1

  const params = new URLSearchParams()
  if (next.status !== "all") params.set("status", next.status)
  if (next.q) params.set("q", next.q)
  if (!(next.sort === "date" && next.dir === "desc")) {
    params.set("sort", next.sort)
    params.set("dir", next.dir)
  }
  if (next.from) params.set("from", next.from)
  if (next.to) params.set("to", next.to)
  if (next.page > 1) params.set("page", String(next.page))

  const qs = params.toString()
  return qs ? `/transactions?${qs}` : "/transactions"
}

/**
 * Builds the CSV export endpoint href for the current query. Mirrors the list
 * filters (status / q / sort / date range) but omits `page` — the export
 * contains every matching transaction, not just the current page.
 */
export function buildExportHref(query: ParsedQuery): string {
  const params = new URLSearchParams()
  if (query.status !== "all") params.set("status", query.status)
  if (query.q) params.set("q", query.q)
  if (!(query.sort === "date" && query.dir === "desc")) {
    params.set("sort", query.sort)
    params.set("dir", query.dir)
  }
  if (query.from) params.set("from", query.from)
  if (query.to) params.set("to", query.to)
  const qs = params.toString()
  return qs ? `/api/transactions/export?${qs}` : "/api/transactions/export"
}

export type CsvTransaction = {
  id: number
  createdAt: Date
  status: string
  total: number
  paymentMethod: string
  amountTendered: number | null
  stripePaymentId: string | null
  cashier: { name: string } | null
  items: { quantity: number; product: { name: string } }[]
}

/** Renders transactions to a CSV string (one row per transaction). */
export function toCSV(rows: CsvTransaction[]): string {
  const headers = [
    "receipt_id",
    "created_at",
    "status",
    "payment_method",
    "total_thb",
    "amount_tendered_thb",
    "change_thb",
    "cashier",
    "stripe_payment_id",
    "items_count",
    "items_summary",
  ]
  const escape = (v: string) => {
    const needsQuote = /[",\n]/.test(v)
    return needsQuote ? `"${v.replace(/"/g, '""')}"` : v
  }

  const lines = [headers.join(",")]
  for (const r of rows) {
    const itemCount = r.items.reduce((sum, i) => sum + i.quantity, 0)
    const summary = r.items.map((i) => `${i.quantity}x ${i.product.name}`).join("; ")
    const change =
      r.paymentMethod === "cash" && r.amountTendered != null
        ? r.amountTendered - r.total
        : null
    lines.push(
      [
        String(r.id),
        r.createdAt.toISOString(),
        r.status,
        r.paymentMethod,
        r.total.toFixed(2),
        r.amountTendered != null ? r.amountTendered.toFixed(2) : "",
        change != null ? change.toFixed(2) : "",
        escape(r.cashier?.name ?? ""),
        r.stripePaymentId ?? "",
        String(itemCount),
        escape(summary),
      ].join(",")
    )
  }
  return lines.join("\n")
}

/** Stripe Dashboard payment URL — only valid for real PaymentIntent ids (pi_…). */
export function stripeDashboardUrl(stripePaymentId: string | null): string | null {
  if (!stripePaymentId || !stripePaymentId.startsWith("pi_")) return null
  return `https://dashboard.stripe.com/test/payments/${stripePaymentId}`
}
