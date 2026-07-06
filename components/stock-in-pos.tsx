"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Loader2, PackagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductSearch, type ProductSearchHit } from "@/components/product-search"
import { StockInList } from "@/components/stock-in-list"
import { NewProductDialog, type NewProduct } from "@/components/new-product-dialog"
import { useHydrated } from "@/hooks/use-hydrated"
import { useStockIn, type StockInItem } from "@/lib/stock-in"

type ProductResponse = {
  status?: string
  message?: string
  id?: number
  barcode?: string
  name?: string
  price?: number
  stock?: number
}

export function StockInPos() {
  const list = useStockIn()
  const hydrated = useHydrated()
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)

  function addProductToList(p: { id: number; barcode: string; name: string; price: number; stock: number }) {
    const item: StockInItem = {
      id: p.id,
      barcode: p.barcode,
      name: p.name,
      price: p.price,
      currentStock: p.stock,
      quantity: 1,
    }
    list.add(item)
    toast.success(`Added "${p.name}"`)
  }

  function handleSelectProduct(p: ProductSearchHit) {
    addProductToList({
      id: p.id,
      barcode: p.barcode,
      name: p.name,
      price: p.price,
      stock: p.stock,
    })
  }

  async function handleBarcodeSubmit(code: string) {
    if (loading) return

    setLoading(true)
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`, {
        cache: "no-store",
      })
      const data = (await res.json()) as ProductResponse
      if (res.status === 404 || data.status === "not_found") {
        // Open the create dialog.
        setPendingBarcode(code)
        return
      }
      if (!res.ok || data.status !== "ok" || typeof data.id !== "number") {
        toast.error(data.message ?? "Lookup failed")
        return
      }
      addProductToList({
        id: data.id,
        barcode: data.barcode ?? code,
        name: data.name ?? `Unknown ${code}`,
        price: data.price ?? 0,
        stock: data.stock ?? 0,
      })
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(product: NewProduct) {
    addProductToList({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      stock: product.stock,
    })
  }

  async function handleApply() {
    if (applying || list.items.length === 0) return
    setApplying(true)
    try {
      const res = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: list.items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      })
      const data = (await res.json()) as { status?: string; message?: string; updated?: number }
      if (!res.ok || data.status !== "ok") {
        toast.error(data.message ?? "Could not apply stock-in")
        return
      }
      toast.success(`Stocked in ${list.count} unit(s) across ${list.distinct} product(s)`)
      list.clear()
    } catch {
      toast.error("Network error")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/" aria-label="Back home">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock-in</h1>
          <p className="text-sm text-muted-foreground">
            Scan or type a barcode to add stock. New barcodes open a create dialog.
          </p>
        </div>
      </header>

      <div className="mb-6">
        <ProductSearch
          placeholder="Scan or type a barcode, then press Enter"
          submitLabel="Look up"
          busy={loading}
          onSelectProduct={handleSelectProduct}
          onSubmitBarcode={handleBarcodeSubmit}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!hydrated ? null : (
            <StockInList
              items={list.items}
              onInc={list.inc}
              onDec={list.dec}
              onSetQty={list.setQty}
              onRemove={list.remove}
            />
          )}
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Restock summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products</span>
                <span className="tabular-nums">{list.distinct}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Units to add</span>
                <span className="tabular-nums">{list.count}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleApply}
                disabled={!hydrated || applying || list.items.length === 0}
              >
                {applying ? <Loader2 className="animate-spin" /> : <PackagePlus />}
                {applying ? "Applying…" : "Apply stock-in"}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => list.clear()}
                disabled={!hydrated || list.items.length === 0}
              >
                <Trash2 />
                Clear list
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>

      <NewProductDialog
        barcode={pendingBarcode ?? ""}
        open={pendingBarcode !== null}
        onOpenChange={(next) => {
          if (!next) setPendingBarcode(null)
        }}
        onCreated={handleCreated}
      />
    </div>
  )
}
