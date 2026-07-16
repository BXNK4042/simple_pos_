import { prisma } from "@/lib/prisma"

export type RequestItem = { id: number; quantity: number }

export type ServerItem = {
  product: { id: number; price: number }
  quantity: number
  subtotal: number
}

export type BuildResult =
  | { ok: true; items: ServerItem[]; total: number }
  | { ok: false; status: number; message: string }

/**
 * Validates the client cart against the database, recomputing prices and
 * guarding quantities against current stock. Returns the server-trusted line
 * items plus their total — client-supplied totals are never trusted.
 *
 * Stock semantics for a POS: a cashier may legitimately sell the last unit
 * (stock can go to 0), so we treat the *cart snapshot* of stock as the
 * authoritative upper bound. This prevents paying for more than the product
 * record claims exists at scan time.
 *
 * Shared by /api/payment-intent (card) and /api/pay-cash so totals are
 * computed identically on both paths.
 */
export async function buildServerItems(clientItems: RequestItem[]): Promise<BuildResult> {
  if (clientItems.length === 0) {
    return { ok: false, status: 400, message: "Cart is empty" }
  }

  const ids = clientItems.map((i) => i.id)
  const products = await prisma.product.findMany({ where: { id: { in: ids } } })

  const items: ServerItem[] = []
  let total = 0

  for (const entry of clientItems) {
    const product = products.find((p) => p.id === entry.id)
    if (!product) {
      return { ok: false, status: 404, message: `Product ${entry.id} not found` }
    }
    // Backstop: a product disabled after it was already in the cart must not
    // be sellable. Enforced here so both the card and cash paths refuse it
    // identically at the server-trusted totals layer.
    if (!product.isActive) {
      return {
        ok: false,
        status: 409,
        message: `“${product.name}” is no longer available for sale`,
      }
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
