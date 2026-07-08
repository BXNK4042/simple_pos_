"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Cart } from "@/components/cart"
import { ProductSearch, type ProductSearchHit } from "@/components/product-search"
import { PageContainer } from "@/components/page-container"
import { cn } from "@/lib/utils"
import { formatTHB } from "@/lib/format"
import { useCart, type AddStatus } from "@/lib/cart"
import type { ScanResult } from "@/lib/scan-events"

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()

function notify(status: AddStatus, name: string) {
  if (status === "capped") toast.warning(`"${name}" is at stock limit`)
  else toast.success(`Added "${name}"`)
}

export function CashierPos() {
  const router = useRouter()
  const cart = useCart()
  const [loading, setLoading] = useState(false)
  const [scanner, setScanner] = useState<"connecting" | "live" | "offline">("connecting")

  const addItemRef = useRef(cart.addItem)
  useEffect(() => {
    addItemRef.current = cart.addItem
  }, [cart.addItem])

  useEffect(() => {
    const es = new EventSource("/api/scans/stream")
    es.onopen = () => setScanner("live")
    es.onerror = () => setScanner("offline")
    es.onmessage = (event) => {
      try {
        const scan = JSON.parse(event.data) as ScanResult
        notify(addItemRef.current(scan), scan.product)
      } catch {
        // ignore malformed payloads
      }
    }
    return () => es.close()
  }, [])

  async function handleBarcodeSubmit(code: string) {
    if (loading) return

    setLoading(true)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code }),
      })
      const data = (await res.json()) as ScanResult & { status?: string; message?: string }
      if (!res.ok || data.status !== "ok") {
        toast.error(data.message ?? "Scan failed")
        return
      }
      notify(cart.addItem(data), data.product)
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleSelectProduct(p: ProductSearchHit) {
    const scan: ScanResult = {
      id: p.id,
      barcode: p.barcode,
      product: p.name,
      price: p.price,
      stock: p.stock,
      currency: CURRENCY,
    }
    notify(cart.addItem(scan), scan.product)
  }

  function handlePay() {
    if (cart.count === 0) return
    router.push("/payment")
  }

  return (
    <PageContainer>
      <header className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Cashier</h1>
          <Badge
            variant={
              scanner === "live" ? "success" : scanner === "offline" ? "warning" : "secondary"
            }
            className="gap-1.5"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                scanner === "live"
                  ? "bg-success animate-pulse"
                  : scanner === "offline"
                    ? "bg-warning"
                    : "bg-muted-foreground"
              )}
            />
            {scanner === "live"
              ? "Scanner live"
              : scanner === "offline"
                ? "Scanner offline"
                : "Connecting"}
          </Badge>
        </div>
      </header>

      <div className="mb-6">
        <ProductSearch
          placeholder="Scan or type a barcode, then press Enter"
          submitLabel="Add"
          busy={loading}
          onSelectProduct={handleSelectProduct}
          onSubmitBarcode={handleBarcodeSubmit}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Cart
            items={cart.items}
            onInc={cart.inc}
            onDec={cart.dec}
            onRemove={cart.remove}
          />
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-20 shadow-sm shadow-primary/5">
            <CardHeader>
              <CardTitle>Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="tabular-nums">{cart.count}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatTHB(cart.total)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                variant="accent"
                className="w-full"
                size="lg"
                onClick={handlePay}
                disabled={cart.count === 0}
              >
                <CreditCard />
                Pay
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => cart.clear()}
                disabled={cart.count === 0}
              >
                <Trash2 />
                Clear cart
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </PageContainer>
  )
}
