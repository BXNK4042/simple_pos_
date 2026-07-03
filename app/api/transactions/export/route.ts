import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import {
  buildOrderBy,
  buildWhere,
  parseQuery,
  toCSV,
  type CsvTransaction,
} from "@/lib/transactions"

/**
 * CSV export — respects the same status / search / sort filters as the list
 * page (via the same query params) but exports EVERY matching transaction,
 * not just the current page.
 */
export async function GET(request: Request) {
  const session = await requireOwnerResponse()
  if (session instanceof Response) return session

  const url = new URL(request.url)
  const query = parseQuery(Object.fromEntries(url.searchParams.entries()))
  const where = buildWhere(query)
  const orderBy = buildOrderBy(query)

  const rows = await prisma.transaction.findMany({
    where,
    orderBy,
    select: {
      id: true,
      createdAt: true,
      status: true,
      total: true,
      stripePaymentId: true,
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
  })

  const csv = toCSV(rows as CsvTransaction[])
  const today = new Date().toISOString().slice(0, 10)

  // Leading BOM so Excel reads the UTF-8 encoding correctly.
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
