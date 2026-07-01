"use client"

import Link from "next/link"
import { ArrowLeft, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useHydrated } from "@/hooks/use-hydrated"
import { formatTHB, useCart } from "@/lib/cart"

export default function PaymentPage() {
  const cart = useCart()
  const hydrated = useHydrated()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Payment</h1>

      {!hydrated ? null : cart.count === 0 ? (
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
          <CardFooter className="flex flex-col items-start gap-4">
            <p className="text-xs text-muted-foreground">
              <CreditCard className="mr-1 inline size-3.5" />
              Embedded Stripe Payment Element arrives in Milestone 6.
            </p>
            <Button asChild variant="outline">
              <Link href="/cashier">
                <ArrowLeft />
                Back to cashier
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
