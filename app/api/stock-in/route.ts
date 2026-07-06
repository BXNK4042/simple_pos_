import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { stockInSchema } from "@/lib/schemas"

/**
 * POST /api/stock-in — owner-only. Increments stock for each line in a single
 * transaction. Quantities are validated server-side; client values are the
 * source of the *delta* (unlike /api/payment-intent, where totals are
 * recomputed), because the user is explicitly choosing how much to add.
 *
 * Increment is a relative delta so concurrent stock changes don't cause lost
 * updates. There is no clamp (we only ever add).
 */
export async function POST(request: Request) {
  const auth = await requireOwnerResponse()
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsed = stockInSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid stock-in"
    return Response.json({ status: "error", message: firstError }, { status: 400 })
  }

  const items = parsed.data.items
  const ids = items.map((i) => i.id)

  // Confirm every product exists before touching anything.
  const found = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })
  if (found.length !== ids.length) {
    return Response.json(
      { status: "error", message: "One or more products no longer exist." },
      { status: 404 }
    )
  }

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.product.update({
          where: { id: item.id },
          data: { stock: { increment: item.quantity } },
        })
      )
    )
    return Response.json({ status: "ok", updated: items.length })
  } catch (error) {
    console.error("/api/stock-in error:", error)
    return Response.json(
      { status: "error", message: "Failed to apply stock-in" },
      { status: 500 }
    )
  }
}
