"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { toast } from "sonner"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStripeJs } from "@/lib/stripe-client"

type CheckoutFormProps = {
  clientSecret: string
  transactionId: number
}

function PaymentForm({ transactionId }: { transactionId: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/payment/success?tid=${transactionId}`,
      },
      redirect: "if_required",
    })

    if (result.error) {
      toast.error(result.error.message ?? "Payment failed")
      setSubmitting(false)
      return
    }

    const pi = result.paymentIntent
    if (pi.status === "succeeded") {
      router.push(`/payment/success?tid=${transactionId}`)
      return
    }

    toast(`Payment status: ${pi.status}`)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{ layout: "tabs" }}
        className="rounded-lg border p-3"
      />
      <Button type="submit" className="w-full" size="lg" disabled={!stripe || submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </form>
  )
}

export function CheckoutForm({ clientSecret, transactionId }: CheckoutFormProps) {
  const options = useMemo(
    () => ({ clientSecret, appearance: { theme: "stripe" as const } }),
    [clientSecret]
  )

  return (
    <Elements stripe={getStripeJs()} options={options}>
      <PaymentForm transactionId={transactionId} />
    </Elements>
  )
}
