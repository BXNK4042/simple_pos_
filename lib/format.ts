const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "th"

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(amount)
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
})

/** Formats a date in Bangkok time (UTC+7), locale-independent for admin UI. */
export function formatDateTime(date: Date): string {
  return dateFormatter.format(date)
}
