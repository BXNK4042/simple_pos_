import { Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

/**
 * Decrement stock for each sale line item, clamped at 0. A stock snapshot may
 * drift between scan and finalise; never let stock go negative.
 *
 * Shared by the Stripe webhook (payment_intent.succeeded) and the cash-payment
 * route so both finalisation paths decrement stock identically.
 *
 * Must run inside the caller's prisma.$transaction so the stock write commits
 * atomically with the status flip.
 */
export async function decrementStock(
  tx: Tx,
  items: { productId: number; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })
    // Clamp any row that dropped below 0 back to 0.
    await tx.product.updateMany({
      where: { id: item.productId, stock: { lt: 0 } },
      data: { stock: 0 },
    })
  }
}

/**
 * Clamps a single product's stock at 0 after a relative decrement.
 * Owner-only stock-out path. Must run inside the caller's $transaction.
 */
export async function decrementClamped(
  tx: Tx,
  productId: number,
  quantity: number
): Promise<void> {
  await tx.product.updateMany({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  })
  await tx.product.updateMany({
    where: { id: productId, stock: { lt: 0 } },
    data: { stock: 0 },
  })
}
