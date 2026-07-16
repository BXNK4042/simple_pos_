"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageContainer } from "@/components/page-container"
import { useHydrated } from "@/hooks/use-hydrated"
import { formatTHB } from "@/lib/format"
import { useCart } from "@/lib/cart"

type ReceiptItem = { product: { name: string }; quantity: number; subtotal: number }
type Transaction = {
  id: number
  status: string
  total: number
  paymentMethod?: string
  amountTendered?: number | null
  createdAt: string
  items: ReceiptItem[]
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; transaction: Transaction }
  | { kind: "error"; message: string }

export default function SuccessPage() {
  // useSearchParams() must sit inside a Suspense boundary at build time.
  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessContent />
    </Suspense>
  )
}

function SuccessFallback() {
  return (
    <PageContainer maxWidth="2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Payment</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Confirming your payment…
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function SuccessContent() {
  const params = useSearchParams()
  const tid = Number(params.get("tid"))
  const validTid = Number.isFinite(tid) && tid > 0
  const hydrated = useHydrated()
  const cart = useCart()
  const didClear = useRef(false)

  // Invalid tid is derived during render (no setState-in-effect needed); the
  // polling effect only runs for valid ids.
  const [state, setState] = useState<State>(
    validTid ? { kind: "loading" } : { kind: "error", message: "Missing transaction id." }
  )

  useEffect(() => {
    if (!validTid) return
    let cancelled = false
    let attempts = 0

    async function poll() {
      while (!cancelled && attempts < 10) {
        attempts += 1
        try {
          const res = await fetch(`/api/payment-intent/status?tid=${tid}`, {
            cache: "no-store",
          })
          const data = (await res.json()) as {
            status?: string
            message?: string
            transaction?: Transaction
          }
          if (res.ok && data.status === "ok" && data.transaction) {
            if (!cancelled) setState({ kind: "ok", transaction: data.transaction })
            return
          }
        } catch {
          // network blip — keep polling
        }
        await new Promise((r) => setTimeout(r, 800))
      }
      if (!cancelled) {
        setState({
          kind: "error",
          message: "Could not confirm your payment. Check the dashboard.",
        })
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [validTid, tid])

  // Clear the cart once the webhook has confirmed payment — never before.
  useEffect(() => {
    if (state.kind === "ok" && !didClear.current) {
      didClear.current = true
      cart.clear()
    }
  }, [state, cart])

  return (
    <PageContainer maxWidth="2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Payment</h1>

      {!hydrated ? null : state.kind === "loading" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Confirming your payment…
          </CardContent>
        </Card>
      ) : state.kind === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-sm">
            <p className="text-muted-foreground">{state.message}</p>
            <Button asChild variant="outline">
              <Link href="/cashier">Back to cashier</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm shadow-success/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-5" />
              </span>
              Payment successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Receipt #{state.transaction.id}</span>
              {state.transaction.paymentMethod ? (
                <span className="capitalize">{state.transaction.paymentMethod}</span>
              ) : null}
            </div>
            {state.transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.product.name}{" "}
                  <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="tabular-nums">{formatTHB(item.subtotal)}</span>
              </div>
            ))}
            <Separator className="my-3" />
            {state.transaction.paymentMethod === "cash" &&
            state.transaction.amountTendered != null ? (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash tendered</span>
                  <span className="tabular-nums">
                    {formatTHB(state.transaction.amountTendered)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Change</span>
                  <span className="tabular-nums">
                    {formatTHB(state.transaction.amountTendered - state.transaction.total)}
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between text-base font-semibold">
              <span>Total paid</span>
              <span className="tabular-nums">{formatTHB(state.transaction.total)}</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <Button asChild variant="accent">
              <Link href="/cashier">New sale</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </PageContainer>
  )
}
