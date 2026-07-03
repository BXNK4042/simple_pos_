import Stripe from "stripe"

export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toLowerCase()

/**
 * Stripe stores amounts in the smallest currency unit. THB is a 2-decimal
 * currency, so 1 baht = 100 satang.
 */
export function toStripeAmount(thb: number): number {
  return Math.round(thb * 100)
}

const globalForStripe = globalThis as unknown as { __stripe?: Stripe }

function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env (see pos-system-tech-stack.md §8)."
    )
  }
  return new Stripe(key, {
    // Pin to the api version shipped with the installed SDK so the types match.
    apiVersion: "2026-06-24.dahlia",
  })
}

/**
 * Server-side Stripe singleton. This module imports the `stripe` node SDK and
 * must never be imported from a client component — use lib/stripe-client.ts.
 * Cached on globalThis to survive dev HMR.
 */
export const stripe: Stripe = globalForStripe.__stripe ?? createStripeClient()
if (process.env.NODE_ENV !== "production") globalForStripe.__stripe = stripe
