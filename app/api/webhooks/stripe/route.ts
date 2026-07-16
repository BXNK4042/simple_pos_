import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { decrementStock } from "@/lib/stock"

/**
 * Stripe webhook — the source of truth for payment status.
 *
 * Run locally with:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * and put the printed `whsec_…` in STRIPE_WEBHOOK_SECRET.
 *
 * The page can be closed before confirmPayment() resolves, so the Transaction
 * is only ever marked "paid" here (never on the client). Stock is decremented
 * here too. Idempotency: if the event is replayed (Stripe retries) and the
 * Transaction is already "paid", we short-circuit without re-decrementing.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return new Response("Webhook not configured", { status: 500 })
  }

  let event: Stripe.Event
  try {
    // Raw body is required for signature verification — request.text() gives
    // the unparsed body (see node_modules/next/dist/docs/.../route.md).
    const payload = await request.text()
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Webhook signature verification failed:", message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(event.data.object)
        break
      case "payment_intent.payment_failed":
        await handleFailed(event.data.object)
        break
      default:
        // Other event types are ignored — only the two above affect our state.
        break
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error)
    // Return 500 so Stripe retries; our idempotency guard makes retries safe.
    return new Response("Internal error", { status: 500 })
  }

  return new Response(null, { status: 200 })
}

async function handleSucceeded(pi: Stripe.PaymentIntent) {
  const transaction = await prisma.transaction.findFirst({
    where: { stripePaymentId: pi.id },
    include: { items: true },
  })

  if (!transaction) {
    // Unknown PaymentIntent — log and acknowledge so Stripe doesn't retry.
    console.warn(`Webhook: no transaction for PaymentIntent ${pi.id}`)
    return
  }

  // Idempotency: already finalised — don't decrement stock twice.
  if (transaction.status === "paid") return

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "paid" },
    })

    // Decrement stock for each line item, clamped at 0 (a stock snapshot may
    // have drifted between scan and webhook; never go negative). Shared with
    // the cash-payment path via lib/stock.ts so both finalisers match.
    await decrementStock(
      tx,
      transaction.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    )
  })
}

async function handleFailed(pi: Stripe.PaymentIntent) {
  await prisma.transaction.updateMany({
    where: { stripePaymentId: pi.id, status: "pending" },
    data: { status: "failed" },
  })
}
