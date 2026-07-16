import { prisma } from "@/lib/prisma"
import { stripe, toStripeAmount, CURRENCY } from "@/lib/stripe"
import { requireSessionResponse } from "@/lib/auth"
import { buildServerItems, type RequestItem } from "@/lib/server-items"

export async function POST(request: Request) {
  const session = await requireSessionResponse()
  if (session instanceof Response) return session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON body" }, { status: 400 })
  }

  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>
  const rawItems = Array.isArray(record.items) ? (record.items as unknown[]) : []

  const clientItems: RequestItem[] = []
  for (const raw of rawItems) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
    const id = Number(r.id)
    const quantity = Number(r.quantity)
    if (Number.isFinite(id) && Number.isFinite(quantity)) {
      clientItems.push({ id, quantity })
    }
  }

  const validated = await buildServerItems(clientItems)
  if (!validated.ok) {
    return Response.json(
      { status: "error", message: validated.message },
      { status: validated.status }
    )
  }

  const { items, total } = validated

  try {
    // Create the Stripe PaymentIntent and the pending Transaction together.
    // The Transaction is created "pending" and only the webhook (source of
    // truth) flips it to "paid" — see app/api/webhooks/stripe/route.ts.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(total),
      currency: CURRENCY,
      description: "Retail Store Purchase",
      automatic_payment_methods: { enabled: true },
    })

    const transaction = await prisma.transaction.create({
      data: {
        total,
        status: "pending",
        stripePaymentId: paymentIntent.id,
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

    return Response.json({
      status: "ok",
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      total,
    })
  } catch (error) {
    console.error("/api/payment-intent error:", error)
    return Response.json(
      { status: "error", message: "Failed to create payment" },
      { status: 500 }
    )
  }
}
