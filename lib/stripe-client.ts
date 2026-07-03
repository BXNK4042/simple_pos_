"use client"

import { loadStripe, type Stripe } from "@stripe/stripe-js"

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Client-side Stripe.js loader. Lazily initialised so SSR never touches the
 * publishable key. Memoised on a module-level promise so Elements re-renders
 * stay stable.
 */
export function getStripeJs(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in .env")
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}
