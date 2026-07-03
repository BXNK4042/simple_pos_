"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CreditCard, ScanLine, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Cart } from "@/components/cart"
import { formatTHB } from "@/lib/format"
import { useCart, type AddStatus } from "@/lib/cart"
import type { ScanResult } from "@/lib/scan-events"

function notify(status: AddStatus, name: string) {
  if (status === "capped") toast.warning(`"${name}" is at stock limit`)
  else toast.success(`Added "${name}"`)
}

export function CashierPos() {
  const router = useRouter()
  const cart = useCart()
  const [barcode, setBarcode] = useState("")
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

  async function handleScan(event: React.FormEvent) {
    event.preventDefault()
    const code = barcode.trim()
    if (!code || loading) return

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
      setBarcode("")
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handlePay() {
    if (cart.count === 0) return
    router.push("/payment")
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/" aria-label="Back home">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Cashier</h1>
          <Badge variant={scanner === "live" ? "default" : "secondary"} className="gap-1">
            <span
              className={`size-1.5 rounded-full ${
                scanner === "live" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {scanner === "live" ? "Scanner live" : scanner === "offline" ? "Scanner offline" : "Connecting"}
          </Badge>
        </div>
      </header>

      <form onSubmit={handleScan} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or type a barcode, then press Enter"
            className="pl-9"
            autoFocus
            disabled={loading}
            inputMode="numeric"
          />
        </div>
        <Button type="submit" disabled={loading || barcode.trim() === ""}>
          {loading ? "Adding…" : "Add"}
        </Button>
      </form>

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
          <Card className="sticky top-6">
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
    </div>
  )
}
