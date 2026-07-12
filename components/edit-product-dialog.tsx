"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export type EditProduct = {
  id: number
  sku: string | null
  barcode: string | null
  name: string
  category: string | null
  price: number
  costPrice: number
  stock: number
  isActive: boolean
}

type EditProductDialogProps = {
  product: EditProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the freshly updated product; the parent updates it in the list. */
  onUpdated: (product: EditProduct) => void
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onUpdated,
}: EditProductDialogProps) {
  const [sku, setSku] = useState("")
  const [localBarcode, setLocalBarcode] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("")
  const [costPrice, setCostPrice] = useState("0")
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (product && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSku(product.sku ?? "")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalBarcode(product.barcode ?? "")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(product.name)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(product.category ?? "")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrice(product.price.toString())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCostPrice(product.costPrice.toString())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsActive(product.isActive)
    }
  }, [product, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !product) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim() || undefined,
          barcode: localBarcode.trim() || undefined,
          name: name.trim(),
          category: category.trim() || undefined,
          price: Number(price),
          costPrice: Number(costPrice),
          isActive,
        }),
      })
      const data = (await res.json()) as Partial<EditProduct> & {
        status?: string
        message?: string
      }
      if (!res.ok || data.status !== "ok" || typeof data.id !== "number") {
        toast.error(data.message ?? "Could not update product")
        return
      }
      toast.success(`Updated "${data.name}"`)
      onUpdated({
        ...product,
        id: data.id,
        sku: data.sku ?? sku.trim() ?? null,
        barcode: data.barcode ?? localBarcode.trim() ?? null,
        name: data.name ?? name.trim(),
        category: data.category ?? category.trim() ?? null,
        price: data.price ?? Number(price),
        costPrice: data.costPrice ?? Number(costPrice),
        isActive: data.isActive ?? isActive,
      })
      onOpenChange(false)
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update product details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ep-barcode" className="text-sm font-medium">
              Barcode (Optional)
            </label>
            <Input 
              id="ep-barcode" 
              value={localBarcode} 
              onChange={(e) => setLocalBarcode(e.target.value)}
              className="font-mono" 
              placeholder="e.g. 8851234567890"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ep-sku" className="text-sm font-medium">
              SKU (Optional)
            </label>
            <Input 
              id="ep-sku" 
              value={sku} 
              onChange={(e) => setSku(e.target.value)}
              className="font-mono" 
              placeholder="e.g. ITEM-001"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ep-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Singha Water 600ml"
              autoFocus
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ep-category" className="text-sm font-medium">
              Category (Optional)
            </label>
            <Input
              id="ep-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Beverages"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="ep-price" className="text-sm font-medium">
                Selling Price (THB)
              </label>
              <Input
                id="ep-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ep-cost" className="text-sm font-medium">
                Cost Price (THB)
              </label>
              <Input
                id="ep-cost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="ep-active" 
              checked={isActive} 
              onCheckedChange={setIsActive} 
            />
            <label htmlFor="ep-active" className="text-sm font-medium cursor-pointer">
              Active (Available for sale)
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={submitting || name.trim().length < 2}>
              {submitting ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
