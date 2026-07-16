"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, PackageMinus, PackagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductSearch, type ProductSearchHit } from "@/components/product-search"
import { StockInList } from "@/components/stock-in-list"
import { NewProductDialog, type NewProduct } from "@/components/new-product-dialog"
import { PageContainer } from "@/components/page-container"
import { useHydrated } from "@/hooks/use-hydrated"
import { useStockIn, type StockInItem } from "@/lib/stock-in"

type Mode = "in" | "out"

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
  const [mode, setMode] = useState<Mode>("in")
  const isOut = mode === "out"

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
      barcode: product.barcode ?? "",
      name: product.name,
      price: product.price,
      stock: product.stock,
    })
  }

  async function handleApply() {
    if (applying || list.items.length === 0) return
    setApplying(true)
    try {
      const endpoint = isOut ? "/api/stock-out" : "/api/stock-in"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: list.items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      })
      const data = (await res.json()) as { status?: string; message?: string; updated?: number }
      if (!res.ok || data.status !== "ok") {
        toast.error(data.message ?? `Could not apply stock-${mode}`)
        return
      }
      toast.success(
        isOut
          ? `Removed ${list.count} unit(s) across ${list.distinct} product(s)`
          : `Stocked in ${list.count} unit(s) across ${list.distinct} product(s)`
      )
      list.clear()
    } catch {
      toast.error("Network error")
    } finally {
      setApplying(false)
    }
  }

  return (
    <PageContainer>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory moves</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan or type a barcode to add or remove stock. New barcodes open a create dialog.
        </p>
      </header>

      <div className="mb-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="in">Stock in</TabsTrigger>
            <TabsTrigger value="out">Stock out</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
          {!hydrated ? (
            <div className="rounded-xl border border-border/70 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="mt-3 h-20 w-full" />
            </div>
          ) : (
            <StockInList
              items={list.items}
              mode={mode}
              onInc={list.inc}
              onDec={list.dec}
              onSetQty={list.setQty}
              onRemove={list.remove}
            />
          )}
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-20 shadow-sm shadow-primary/5">
            <CardHeader>
              <CardTitle>{isOut ? "Stock-out summary" : "Restock summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products</span>
                <span className="tabular-nums">{list.distinct}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Units to {isOut ? "remove" : "add"}
                </span>
                <span className="tabular-nums">{list.count}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                variant={isOut ? "destructive" : "accent"}
                className="w-full"
                size="lg"
                onClick={handleApply}
                disabled={!hydrated || applying || list.items.length === 0}
              >
                {applying ? <Loader2 className="animate-spin" /> : isOut ? <PackageMinus /> : <PackagePlus />}
                {applying
                  ? "Applying…"
                  : isOut
                    ? "Apply stock-out"
                    : "Apply stock-in"}
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
    </PageContainer>
  )
}
