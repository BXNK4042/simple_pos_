import Image from "next/image"
import Link from "next/link"
// Static import: Next content-hashes the file into the URL
// (/_next/static/media/<hash>.png), so replacing assets/mascot.png
// changes the hash → URL → automatic cache bust. No version bump, no
// manual cache clearing. Just overwrite the file and reload.
import mascotImg from "@/assets/mascot.png"
import { Banknote, ReceiptText, ScanLine, TriangleAlert } from "lucide-react"
import { getCurrentUser, verifySession } from "@/lib/auth"
import { PageContainer } from "@/components/page-container"
import { cn } from "@/lib/utils"
import { formatTHB } from "@/lib/format"
import { getHomeStats } from "@/lib/stats"
import type { LucideIcon } from "lucide-react"

export default async function Home() {
  const session = await verifySession()
  const user = await getCurrentUser()
  const isOwner = session.role === "owner" && user?.role === "owner"
  const greetingName = user?.name?.split(" ")[0] ?? "there"
  const stats = isOwner ? await getHomeStats() : null

  return (
    <PageContainer className="sm:py-12">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Hero + Cat */}
          <section
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/60 bg-primary/[0.04]",
              isOwner ? "md:col-span-6 lg:col-span-3 lg:row-span-2" : "md:col-span-6"
            )}
          >
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-background/70 via-background/20 to-transparent lg:block" />
            <div className="pointer-events-none mx-5 absolute right-0 bottom-0 hidden h-[70%] w-[42%] lg:block">
              <Image
                src={mascotImg}
                alt="POS mascot waving hello"
                fill
                priority
                sizes="33vw"
                className="animate-float object-contain object-right-bottom"
              />
            </div>
            <div className="relative z-10 flex min-h-[200px] flex-col justify-center p-6 sm:min-h-[240px] lg:min-h-[340px] lg:pr-[45%]">
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
        </div>
    </PageContainer>
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
