"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Cart } from "@/components/cart"
import { ProductSearch, type ProductSearchHit } from "@/components/product-search"
import { NewProductDialog, type NewProduct } from "@/components/new-product-dialog"
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
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)

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
        if (scan.status === "unknown") {
          setUnknownBarcode(scan.barcode)
          return
        }
        if (scan.status === "inactive") {
          toast.error(`“${scan.product}” is not available for sale`)
          return
        }
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
      const data = (await res.json()) as ScanResult | { status: "error"; message?: string }
      if (!res.ok || data.status === "error") {
        toast.error("message" in data ? data.message ?? "Scan failed" : "Scan failed")
        return
      }
      if (data.status === "unknown") {
        setUnknownBarcode(code)
        return
      }
      if (data.status === "inactive") {
        toast.error(`“${data.product}” is not available for sale`)
        return
      }
      notify(cart.addItem(data), data.product)
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(p: NewProduct) {
    const scan: ScanResult = {
      status: "ok",
      id: p.id,
      barcode: p.barcode ?? "",
      product: p.name,
      price: p.price,
      stock: p.stock,
      currency: CURRENCY,
    }
    notify(cart.addItem(scan), p.name)
  }

  function handleSelectProduct(p: ProductSearchHit) {
    const scan: ScanResult = {
      status: "ok",
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

      <Dialog
        open={unknownBarcode !== null && !registerOpen}
        onOpenChange={(next) => {
          if (!next) setUnknownBarcode(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Product not found</DialogTitle>
            <DialogDescription>
              Barcode{" "}
              <span className="font-mono font-medium text-foreground">
                {unknownBarcode}
              </span>{" "}
              is not in the catalog. Register it now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setUnknownBarcode(null)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => setRegisterOpen(true)}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewProductDialog
        key={unknownBarcode ?? "none"}
        barcode={unknownBarcode ?? ""}
        open={registerOpen}
        onOpenChange={(next) => {
          setRegisterOpen(next)
          if (!next) setUnknownBarcode(null)
        }}
        onCreated={handleCreated}
      />
    </PageContainer>
  )
}
