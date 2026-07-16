import type { Metadata } from "next"
import Link from "next/link"
import { Banknote, ReceiptText, ShoppingCart, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardKpis, type Kpi } from "@/components/dashboard/kpis"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopProducts } from "@/components/dashboard/top-products"
import { LowStockTable } from "@/components/dashboard/low-stock-table"
import { DashboardRangeForm } from "@/components/dashboard/range-form"
import { PageContainer } from "@/components/page-container"
import { formatTHB } from "@/lib/format"
import { requireRole } from "@/lib/auth"
import { getDashboardStats, parseDay } from "@/lib/stats"

export const metadata: Metadata = {
  title: "Dashboard | POS System",
}

// Live sales/stock data — never serve a build-time snapshot.
export const dynamic = "force-dynamic"

function toInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  await requireRole("owner")
  const sp = await searchParams
  const from = parseDay(sp.from)
  const to = parseDay(sp.to)
  const hasRange = from !== null
  const stats = await getDashboardStats({
    from: from ?? undefined,
    to: to ?? undefined,
  })

  const rangeLabel = hasRange
    ? to
      ? `${toInputValue(from!)} → ${toInputValue(to)}`
      : toInputValue(from!)
    : "Today"

  const kpis: Kpi[] = [
    {
      label: hasRange ? "Range revenue" : "Today's revenue",
      value: formatTHB(stats.todaysRevenue),
      hint: `${stats.todaysOrderCount} order${stats.todaysOrderCount === 1 ? "" : "s"} · ${rangeLabel}`,
      icon: Banknote,
      featured: true,
    },
    {
      label: hasRange ? "Items sold (range)" : "Items sold today",
      value: String(stats.todaysItems),
      icon: ShoppingCart,
    },
    {
      label: "Low-stock items",
      value: String(stats.lowStockRows.length),
      hint: stats.totalProducts ? `${stats.totalProducts} products total` : undefined,
      icon: TriangleAlert,
      tone: stats.lowStockRows.length > 0 ? "warning" : "default",
    },
    {
      label: "Paid orders",
      value: String(stats.paidOrderCount),
      hint: "all-time",
      icon: ReceiptText,
    },
  ]

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sales and stock overview — {rangeLabel}.
        </p>
      </div>

      <div className="mt-6">
        <DashboardRangeForm initialFrom={sp.from} initialTo={sp.to} />
      </div>

      <div className="mt-6">
        <DashboardKpis kpis={kpis} />
      </div>

      {stats.hasSales ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RevenueChart data={stats.revenueSeries} />
          <TopProducts data={stats.topProducts} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/50 py-14 text-center text-sm text-muted-foreground">
          No paid orders yet — charts will appear after your first sale.
          <Button asChild variant="outline" size="sm">
            <Link href="/cashier">Go to cashier</Link>
          </Button>
        </div>
      )}

      <div className="mt-6">
        <LowStockTable rows={stats.lowStockRows} />
      </div>
    </PageContainer>
  )
}
