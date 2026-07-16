import { prisma } from "@/lib/prisma"
import { LOW_STOCK } from "@/lib/inventory"
import type { RevenuePoint } from "@/components/dashboard/revenue-chart"
import type { TopProduct } from "@/components/dashboard/top-products"
import type { LowStockRow } from "@/components/dashboard/low-stock-table"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SERIES_BUCKETS = 31

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
}

/**
 * Parses a `YYYY-MM-DD` (Bangkok-local) searchParam value into a UTC Date
 * representing the start of that day. Returns null for empty/invalid input.
 * The dashboard accepts local calendar days from the user; we treat the
 * provided YYYY-MM-DD as a calendar day and compare against Transaction
 * timestamps naively (the existing today-snapshot does the same).
 */
function parseDay(value: string | undefined): Date | null {
  if (!value) return null
  const parts = value.split("-").map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Lightweight stats for the home page — only what the bento KPI tiles need.
 * Two indexed queries; safe to run on every page load.
 */
export type HomeStats = {
  todayRevenue: number
  todayOrders: number
  lowStockCount: number
}

export async function getHomeStats(): Promise<HomeStats> {
  const todayStart = startOfDay(new Date())

  const [todays, lowStockCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: "paid", createdAt: { gte: todayStart } },
      select: { total: true },
    }),
    prisma.product.count({ where: { stock: { lte: LOW_STOCK } } }),
  ])

  return {
    todayRevenue: todays.reduce((sum, t) => sum + t.total, 0),
    todayOrders: todays.length,
    lowStockCount,
  }
}

/**
 * Full stats for the dashboard page. One nested-items query covers revenue,
 * items-sold, series, and top products; a second covers low-stock rows.
 *
 * Range semantics:
 *   - No args → today's snapshot + trailing-7-day series (legacy default).
 *   - { from } → single-day report for that calendar day.
 *   - { from, to } → range report; series buckets per day, capped at
 *     MAX_SERIES_BUCKETS days. KPIs (revenue / items / order count) always
 *     reflect the selected range; `paidOrderCount` stays all-time.
 */
export type DashboardStats = {
  todaysRevenue: number
  todaysItems: number
  todaysOrderCount: number
  paidOrderCount: number
  totalProducts: number
  hasSales: boolean
  revenueSeries: RevenuePoint[]
  topProducts: TopProduct[]
  lowStockRows: LowStockRow[]
}

export async function getDashboardStats(
  range?: { from?: Date | null; to?: Date | null }
): Promise<DashboardStats> {
  const todayStart = startOfDay(new Date())
  const fromRaw = range?.from ?? null
  const toRaw = range?.to ?? null
  const hasRange = fromRaw !== null

  const fromStart = fromRaw ? startOfDay(fromRaw) : todayStart
  const toEndInclusive = toRaw ? startOfDay(toRaw) : fromStart
  // Range is inclusive of both days; the query upper bound is exclusive.
  const rangeEndExclusive = new Date(toEndInclusive.getTime() + DAY_MS)

  const paidTxns = await prisma.transaction.findMany({
    where: {
      status: "paid",
      ...(hasRange
        ? { createdAt: { gte: fromStart, lt: rangeEndExclusive } }
        : {}),
    },
    select: {
      total: true,
      createdAt: true,
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
  })

  // All-time count for the "Paid orders" KPI regardless of range.
  const allTimePaidCount = await prisma.transaction.count({ where: { status: "paid" } })

  const [lowStockRows, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: { stock: { lte: LOW_STOCK } },
      orderBy: { stock: "asc" },
      select: { id: true, name: true, barcode: true, price: true, stock: true },
    }),
    prisma.product.count(),
  ])

  // KPIs: today (no range) or the selected range.
  const kpiSet = hasRange
    ? paidTxns
    : paidTxns.filter((t) => t.createdAt.getTime() >= todayStart.getTime())

  const kpiRevenue = kpiSet.reduce((sum, t) => sum + t.total, 0)
  const kpiItems = kpiSet.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
    0
  )

  // Series buckets across the selected window (or trailing 7 days by default).
  const seriesStart = hasRange ? fromStart : new Date(todayStart.getTime() - 6 * DAY_MS)
  const seriesEnd = hasRange ? rangeEndExclusive : new Date(todayStart.getTime() + DAY_MS)
  const daySpan = Math.max(
    1,
    Math.round((seriesEnd.getTime() - seriesStart.getTime()) / DAY_MS)
  )
  const step = Math.max(1, Math.ceil(daySpan / MAX_SERIES_BUCKETS))

  const revenueSeries: RevenuePoint[] = []
  for (let cur = new Date(seriesStart); cur.getTime() < seriesEnd.getTime(); cur = new Date(cur.getTime() + step * DAY_MS)) {
    const bucketEnd = new Date(cur.getTime() + step * DAY_MS)
    const revenue = paidTxns
      .filter((t) => t.createdAt.getTime() >= cur.getTime() && t.createdAt.getTime() < bucketEnd.getTime())
      .reduce((sum, t) => sum + t.total, 0)
    revenueSeries.push({ label: formatDayLabel(cur), revenue })
  }

  const productUnits = new Map<string, number>()
  for (const t of paidTxns) {
    for (const item of t.items) {
      productUnits.set(item.product.name, (productUnits.get(item.product.name) ?? 0) + item.quantity)
    }
  }
  const topProducts: TopProduct[] = [...productUnits.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)

  return {
    todaysRevenue: kpiRevenue,
    todaysItems: kpiItems,
    todaysOrderCount: kpiSet.length,
    paidOrderCount: allTimePaidCount,
    totalProducts,
    hasSales: allTimePaidCount > 0,
    revenueSeries,
    topProducts,
    lowStockRows,
  }
}

export { parseDay }
