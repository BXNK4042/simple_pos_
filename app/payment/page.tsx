"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useHydrated } from "@/hooks/use-hydrated"
import { formatTHB } from "@/lib/format"
import { useCart } from "@/lib/cart"
import { CheckoutForm } from "@/components/checkout-form"

type PendingPayment = {
  clientSecret: string
  transactionId: number
}

export default function PaymentPage() {
  const cart = useCart()
  const hydrated = useHydrated()
  const router = useRouter()
  const [pending, setPending] = useState<PendingPayment | null>(null)
  const [creating, setCreating] = useState(false)

  async function startPayment() {
    if (creating || cart.count === 0) return
    setCreating(true)
    try {
      const res = await fetch("/api/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      })
      const data = (await res.json()) as {
        status?: string
        message?: string
        clientSecret?: string
        transactionId?: number
      }
      if (!res.ok || data.status !== "ok" || !data.clientSecret || !data.transactionId) {
        toast.error(data.message ?? "Could not start payment")
        return
      }
      setPending({ clientSecret: data.clientSecret, transactionId: data.transactionId })
    } catch {
      toast.error("Network error")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Payment</h1>

      {!hydrated ? null : cart.count === 0 && !pending ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-sm text-muted-foreground">
            Your cart is empty.
            <Button asChild variant="outline">
              <Link href="/cashier">
                <ArrowLeft />
                Back to cashier
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.name}{" "}
                  <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="tabular-nums">
                  {formatTHB(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatTHB(cart.total)}</span>
            </div>
          </CardContent>

          {pending ? (
            <CardFooter className="flex flex-col items-stretch gap-4">
              <CheckoutForm
                clientSecret={pending.clientSecret}
                transactionId={pending.transactionId}
              />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPending(null)
                  router.refresh()
                }}
              >
                Cancel
              </Button>
            </CardFooter>
          ) : (
            <CardFooter className="flex flex-col items-stretch gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={startPayment}
                disabled={creating || cart.count === 0}
              >
                {creating ? <Loader2 className="animate-spin" /> : <CreditCard />}
                {creating ? "Starting…" : "Pay now"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/cashier">
                  <ArrowLeft />
                  Back to cashier
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  )
}
