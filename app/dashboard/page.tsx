import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Banknote, ReceiptText, ShoppingCart, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardKpis, type Kpi } from "@/components/dashboard/kpis"
import { RevenueChart, type RevenuePoint } from "@/components/dashboard/revenue-chart"
import { TopProducts, type TopProduct } from "@/components/dashboard/top-products"
import {
  LowStockTable,
  type LowStockRow,
} from "@/components/dashboard/low-stock-table"
import { prisma } from "@/lib/prisma"
import { formatTHB } from "@/lib/format"
import { LOW_STOCK } from "@/lib/inventory"

export const metadata: Metadata = {
  title: "Dashboard | POS System",
}

// Live sales/stock data — never serve a build-time snapshot.
export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
}

export default async function DashboardPage() {
  // One nested-items query covers revenue, items-sold, and top products.
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

  // --- Aggregations (JS, server-side) ---
  const todayStart = startOfDay(new Date())

  const todays = paidTxns.filter((t) => t.createdAt.getTime() >= todayStart.getTime())
  const todaysRevenue = todays.reduce((sum, t) => sum + t.total, 0)
  const todaysItems = todays.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
    0
  )

  // 7-day revenue series, 0-filled for empty days.
  const revenueSeries: RevenuePoint[] = []
  for (let i = 6; i >= 0; i--) {
    const start = new Date(todayStart.getTime() - i * DAY_MS)
    const end = start.getTime() + DAY_MS
    const revenue = paidTxns
      .filter((t) => t.createdAt.getTime() >= start.getTime() && t.createdAt.getTime() < end)
      .reduce((sum, t) => sum + t.total, 0)
    revenueSeries.push({ label: formatDayLabel(start), revenue })
  }

  // Top products by units sold (all-time).
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

  const kpis: Kpi[] = [
    {
      label: "Today's revenue",
      value: formatTHB(todaysRevenue),
      hint: `${todays.length} order${todays.length === 1 ? "" : "s"} today`,
      icon: Banknote,
    },
    {
      label: "Items sold today",
      value: String(todaysItems),
      icon: ShoppingCart,
    },
    {
      label: "Low-stock items",
      value: String(lowStockRows.length),
      hint: totalProducts ? `${totalProducts} products total` : undefined,
      icon: TriangleAlert,
      tone: lowStockRows.length > 0 ? "warning" : "default",
    },
    {
      label: "Paid orders",
      value: String(paidTxns.length),
      hint: "all-time",
      icon: ReceiptText,
    },
  ]

  const lowStock: LowStockRow[] = lowStockRows
  const hasSales = paidTxns.length > 0

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/" aria-label="Back home">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sales and stock overview.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DashboardKpis kpis={kpis} />
      </div>

      {hasSales ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RevenueChart data={revenueSeries} />
          <TopProducts data={topProducts} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No paid orders yet — charts will appear after your first sale.
          <Button asChild variant="outline" size="sm">
            <Link href="/cashier">Go to cashier</Link>
          </Button>
        </div>
      )}

      <div className="mt-6">
        <LowStockTable rows={lowStock} />
      </div>
    </main>
  )
}
