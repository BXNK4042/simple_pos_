import Image from "next/image"
import Link from "next/link"
// Static import: Next content-hashes the file into the URL
// (/_next/static/media/<hash>.png), so replacing assets/mascot.png
// changes the hash → URL → automatic cache bust. No version bump, no
// manual cache clearing. Just overwrite the file and reload.
import mascotImg from "@/assets/mascot.png"
import {
  Banknote,
  LayoutDashboard,
  Package,
  PackagePlus,
  ReceiptText,
  ScanLine,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react"
import { getCurrentUser, verifySession } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { formatTHB } from "@/lib/format"
import { getHomeStats } from "@/lib/stats"
import type { LucideIcon } from "lucide-react"

type ManageItem = { href: string; label: string; icon: LucideIcon }

const MANAGE: ManageItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/stock-in", label: "Stock-in", icon: PackagePlus },
  { href: "/users", label: "Users", icon: Users },
]

export default async function Home() {
  const session = await verifySession()
  const user = await getCurrentUser()
  const isOwner = session.role === "owner" && user?.role === "owner"
  const greetingName = user?.name?.split(" ")[0] ?? "there"
  const stats = isOwner ? await getHomeStats() : null

  return (
    <main id="main" className="flex flex-1 flex-col bg-background">
      <div
        className={cn(
          "mx-auto w-full px-4 py-8 sm:py-12",
          // Cashier view: narrow & centered
          isOwner ? "max-w-6xl" : "max-w-3xl"
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Hero + Cat */}
          <section
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/60 bg-primary/[0.04]",
              isOwner ? "md:col-span-6 lg:col-span-3 lg:row-span-2" : "md:col-span-6"
            )}
          >
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-background/70 via-background/20 to-transparent lg:block" />
            <div className="pointer-events-none m-2 absolute right-0 bottom-0 hidden h-[70%] w-[42%] lg:block">
              <Image
                src={mascotImg}
                alt="POS mascot waving hello"
                fill
                priority
                sizes="33vw"
                className="animate-float object-contain object-right-bottom"
              />
            </div>
            <div className="relative z-10 flex min-h-[200px] flex-col justify-center p-6 sm:min-h-[240px] lg:min-h-[340px]">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-brand" />
                {isOwner ? "Owner workspace" : "Cashier workspace"}
              </div>
              <h1 className="max-w-md text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl">
                Hi {greetingName}, ready to make a sale?
              </h1>
              <p className="mt-3 max-w-sm text-xs text-muted-foreground sm:text-sm">
                {isOwner
                  ? "Open the cashier to ring up orders, or manage the store below."
                  : "Open the cashier to scan items and take payments."}
              </p>
            </div>
          </section>

          {/* Cashier — primary CTA */}
          <Link
            href="/cashier"
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-brand p-6 text-brand-foreground shadow-sm shadow-brand/30 transition-all hover:shadow-lg hover:shadow-brand/20",
              isOwner ? "md:col-span-6 lg:col-span-3 lg:min-h-[164px]" : "md:col-span-6 min-h-[164px]"
            )}
          >
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-foreground/15 backdrop-blur transition-transform group-hover:scale-105">
                <ScanLine className="size-6" />
              </span>
              <span className="text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight">Cashier</span>
                <Banknote className="size-4" />
              </div>
              <p className="mt-1 text-sm text-brand-foreground/80">
                Scan barcodes, build an order, take PromptPay or card.
              </p>
            </div>
          </Link>

          {/* KPI tiles — owner only */}
          {isOwner && stats ? (
            <>
              <KpiTile
                className="md:col-span-2 lg:col-span-1"
                label="Today's revenue"
                value={formatTHB(stats.todayRevenue)}
                icon={Banknote}
              />
              <KpiTile
                className="md:col-span-2 lg:col-span-1"
                label="Orders today"
                value={String(stats.todayOrders)}
                icon={ReceiptText}
              />
              <KpiTile
                className="md:col-span-2 lg:col-span-1"
                label="Low-stock"
                value={String(stats.lowStockCount)}
                icon={TriangleAlert}
                tone={stats.lowStockCount > 0 ? "warning" : "default"}
              />
            </>
          ) : null}

          {/* Manage — owner only */}
          {isOwner ? (
            <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm shadow-primary/5 md:col-span-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Manage
                </h2>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Settings className="size-3.5" />
                  Settings
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {MANAGE.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary"
                  >
                    <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: "default" | "warning"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-primary/5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone === "warning" ? "text-warning" : "text-muted-foreground")} />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  )
}
