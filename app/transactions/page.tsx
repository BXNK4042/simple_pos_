import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionsFilters } from "@/components/transactions/filters"
import {
  TransactionsTable,
  type TransactionRow,
} from "@/components/transactions/transactions-table"
import { TransactionsPagination } from "@/components/transactions/pagination"
import { prisma } from "@/lib/prisma"
import {
  PAGE_SIZE,
  buildExportHref,
  buildOrderBy,
  buildWhere,
  parseQuery,
  totalPages,
} from "@/lib/transactions"

export const metadata: Metadata = {
  title: "Transactions | POS System",
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
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
  }))

  const pages = totalPages(total)
  const hasAnyTransactions = total > 0 || query.q !== "" || query.status !== "all"
  const emptyMessage = !hasAnyTransactions
    ? "No transactions yet — sales will appear here after the first payment."
    : "No transactions match these filters."

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/" aria-label="Back home">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              All sales, newest first. Click a row to view its receipt.
            </p>
          </div>
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
    </main>
  )
}
