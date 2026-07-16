import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { decrementClamped } from "@/lib/stock"
import { stockInSchema } from "@/lib/schemas"

/**
 * POST /api/stock-out — owner-only. Decrements stock for each line in a single
 * transaction, clamped at 0 (damage/shrinkage can exceed counted stock).
 *
 * Mirrors /api/stock-in: client values are the source of the *delta*; the user
 * is explicitly choosing how much to remove. Quantities are validated
 * server-side. Stock is clamped at 0 per line so it never goes negative.
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
    const firstError = parsed.error.issues[0]?.message ?? "Invalid stock-out"
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
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await decrementClamped(tx, item.id, item.quantity)
      }
    })
    return Response.json({ status: "ok", updated: items.length })
  } catch (error) {
    console.error("/api/stock-out error:", error)
    return Response.json(
      { status: "error", message: "Failed to apply stock-out" },
      { status: 500 }
    )
  }
}
