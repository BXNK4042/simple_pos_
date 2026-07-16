import type { Metadata } from "next"
import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionsFilters } from "@/components/transactions/filters"
import {
  TransactionsTable,
  type TransactionRow,
} from "@/components/transactions/transactions-table"
import { TransactionsPagination } from "@/components/transactions/pagination"
import { PageContainer } from "@/components/page-container"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import {
  PAGE_SIZE,
  buildExportHref,
  buildOrderBy,
  buildWhere,
  parseQuery,
  totalPages,
} from "@/lib/transactions"

export const metadata: Metadata = {
  title: "Transactions",
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireRole("owner")
  const query = parseQuery(await searchParams)
  const where = buildWhere(query)
  const orderBy = buildOrderBy(query)

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        paymentMethod: true,
        cashier: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  const tableRows: TransactionRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status as TransactionRow["status"],
    total: r.total,
    itemCount: r.items.reduce((sum, i) => sum + i.quantity, 0),
    paymentMethod: r.paymentMethod,
    cashierName: r.cashier?.name ?? null,
  }))

  const pages = totalPages(total)
  const hasAnyTransactions = total > 0 || query.q !== "" || query.status !== "all" || query.from !== "" || query.to !== ""
  const emptyMessage = !hasAnyTransactions
    ? "No transactions yet — sales will appear here after the first payment."
    : "No transactions match these filters."

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All sales, newest first. Click a row to view its receipt.
          </p>
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildExportHref(query)}>
                <Download />
                Export CSV
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <TransactionsFilters current={query} total={total} />

        <TransactionsTable rows={tableRows} current={query} emptyMessage={emptyMessage} />

        <TransactionsPagination current={query} totalPages={pages} />
      </div>
    </PageContainer>
  )
}
