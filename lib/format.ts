const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "th"

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(amount)
}
