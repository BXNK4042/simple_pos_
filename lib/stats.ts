import { prisma } from "@/lib/prisma"
import { LOW_STOCK } from "@/lib/inventory"
import type { RevenuePoint } from "@/components/dashboard/revenue-chart"
import type { TopProduct } from "@/components/dashboard/top-products"
import type { LowStockRow } from "@/components/dashboard/low-stock-table"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
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
 * items-sold, 7-day series, and top products; a second covers low-stock rows.
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const paidTxns = await prisma.transaction.findMany({
    where: { status: "paid" },
    select: {
      total: true,
      createdAt: true,
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
  })

  const [lowStockRows, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: { stock: { lte: LOW_STOCK } },
      orderBy: { stock: "asc" },
      select: { id: true, name: true, barcode: true, price: true, stock: true },
    }),
    prisma.product.count(),
  ])

  const todayStart = startOfDay(new Date())

  const todays = paidTxns.filter((t) => t.createdAt.getTime() >= todayStart.getTime())
  const todaysRevenue = todays.reduce((sum, t) => sum + t.total, 0)
  const todaysItems = todays.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
    0
  )

  const revenueSeries: RevenuePoint[] = []
  for (let i = 6; i >= 0; i--) {
    const start = new Date(todayStart.getTime() - i * DAY_MS)
    const end = start.getTime() + DAY_MS
    const revenue = paidTxns
      .filter((t) => t.createdAt.getTime() >= start.getTime() && t.createdAt.getTime() < end)
      .reduce((sum, t) => sum + t.total, 0)
    revenueSeries.push({ label: formatDayLabel(start), revenue })
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
    todaysRevenue,
    todaysItems,
    todaysOrderCount: todays.length,
    paidOrderCount: paidTxns.length,
    totalProducts,
    hasSales: paidTxns.length > 0,
    revenueSeries,
    topProducts,
    lowStockRows,
  }
}
