import { prisma } from "@/lib/prisma"
import { requireSessionResponse } from "@/lib/auth"
import { buildServerItems } from "@/lib/server-items"
import { decrementStock } from "@/lib/stock"
import { payCashSchema } from "@/lib/schemas"

/**
 * POST /api/pay-cash — session-scoped (cashier may finalize a cash sale).
 *
 * Cash has no external payment provider and therefore no webhook. Unlike the
 * card path (which creates a "pending" Transaction finalised by the Stripe
 * webhook), cash finalises *synchronously* here inside one prisma.$transaction:
 * the Transaction is created "paid" and stock is decremented atomically. The
 * client never marks a sale paid — it only observes the result.
 *
 * Server-trusted totals come from buildServerItems (shared with the card path),
 * so client-supplied prices/quantities are discarded. `tendered` is validated
 * against the recomputed total. `amountTendered` is stored so the change line
 * (tendered − total) can be rendered on the receipt later.
 *
 * stripePaymentId stays null for cash; that is the discriminator for "cash"
 * alongside the paymentMethod column.
 */
export async function POST(request: Request) {
  const session = await requireSessionResponse()
  if (session instanceof Response) return session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = payCashSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid cash payment"
    return Response.json({ status: "error", message: firstError }, { status: 400 })
  }

  const { items: clientItems, tendered } = parsed.data

  const validated = await buildServerItems(clientItems)
  if (!validated.ok) {
    return Response.json(
      { status: "error", message: validated.message },
      { status: validated.status }
    )
  }

  const { items, total } = validated

  if (tendered < total) {
    return Response.json(
      {
        status: "error",
        message: `Cash tendered (${tendered.toFixed(2)}) is less than total (${total.toFixed(2)}).`,
      },
      { status: 400 }
    )
  }

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          total,
          status: "paid",
          paymentMethod: "cash",
          amountTendered: tendered,
          stripePaymentId: null,
          cashierId: session.userId,
          items: {
            create: items.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              subtotal: i.subtotal,
            })),
          },
        },
      })

      await decrementStock(
        tx,
        items.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
      )

      return created
    })

    return Response.json({
      status: "ok",
      transactionId: transaction.id,
      total,
      tendered,
      change: tendered - total,
    })
  } catch (error) {
    console.error("/api/pay-cash error:", error)
    return Response.json(
      { status: "error", message: "Failed to record cash payment" },
      { status: 500 }
    )
  }
}
