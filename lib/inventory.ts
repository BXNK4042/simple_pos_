/**
 * Shared inventory thresholds. Single source of truth so the products page
 * and the dashboard agree on what counts as "low stock".
 */
export const LOW_STOCK = 5

export function isOut(stock: number): boolean {
  return stock <= 0
}

export function isLow(stock: number): boolean {
  return stock > 0 && stock <= LOW_STOCK
}
