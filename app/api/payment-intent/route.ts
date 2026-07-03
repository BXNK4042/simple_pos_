import { prisma } from "@/lib/prisma"
import { stripe, toStripeAmount, CURRENCY } from "@/lib/stripe"

type RequestItem = { id: number; quantity: number }

/**
 * Validates the client cart against the database, recomputing prices and
 * guarding quantities against current stock. Returns the server-trusted line
 * items plus their total — client-supplied totals are never trusted.
 *
 * Stock semantics for a POS: a cashier may legitimately sell the last unit
 * (stock can go to 0), so we treat the *cart snapshot* of stock as the
 * authoritative upper bound. This prevents paying for more than the product
 * record claims exists at scan time.
 */
async function buildServerItems(
  clientItems: RequestItem[]
): Promise<
  | { ok: true; items: { product: { id: number; price: number }; quantity: number; subtotal: number }[]; total: number }
  | { ok: false; status: number; message: string }
> {
  if (clientItems.length === 0) {
    return { ok: false, status: 400, message: "Cart is empty" }
  }

  const ids = clientItems.map((i) => i.id)
  const products = await prisma.product.findMany({ where: { id: { in: ids } } })

  const items: {
    product: { id: number; price: number }
    quantity: number
    subtotal: number
  }[] = []
  let total = 0

  for (const entry of clientItems) {
    const product = products.find((p) => p.id === entry.id)
    if (!product) {
      return { ok: false, status: 404, message: `Product ${entry.id} not found` }
    }
    const quantity = Math.floor(entry.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, status: 400, message: "Invalid quantity" }
    }
    // Guard against the stock snapshot held by the cart at scan time.
    if (product.stock > 0 && quantity > product.stock) {
      return {
        ok: false,
        status: 409,
        message: `"${product.name}" only has ${product.stock} in stock`,
      }
    }
    const subtotal = product.price * quantity
    total += subtotal
    items.push({ product: { id: product.id, price: product.price }, quantity, subtotal })
  }

  return { ok: true, items, total }
}

export async function POST(request: Request) {
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
      automatic_payment_methods: { enabled: true },
    })

    const transaction = await prisma.transaction.create({
      data: {
        total,
        status: "pending",
        stripePaymentId: paymentIntent.id,
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
