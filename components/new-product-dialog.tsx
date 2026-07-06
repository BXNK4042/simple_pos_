"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, PackagePlus } from "lucide-react"
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

export type NewProduct = {
  id: number
  barcode: string
  name: string
  price: number
  stock: number
}

type NewProductDialogProps = {
  barcode: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the freshly created product; the parent adds it to the list. */
  onCreated: (product: NewProduct) => void
}

export function NewProductDialog({
  barcode,
  open,
  onOpenChange,
  onCreated,
}: NewProductDialogProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName("")
    setPrice("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, name: name.trim(), price: Number(price) }),
      })
      const data = (await res.json()) as Partial<NewProduct> & {
        status?: string
        message?: string
      }
      if (!res.ok || data.status !== "ok" || typeof data.id !== "number") {
        toast.error(data.message ?? "Could not create product")
        return
      }
      toast.success(`Created "${data.name}"`)
      onCreated({
        id: data.id,
        barcode: data.barcode ?? barcode,
        name: data.name ?? name.trim(),
        price: data.price ?? Number(price),
        stock: data.stock ?? 0,
      })
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>
            This barcode isn&apos;t in the catalog yet. Add it before stocking it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="np-barcode" className="text-sm font-medium">
              Barcode
            </label>
            <Input id="np-barcode" value={barcode} readOnly className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Singha Water 600ml"
              autoFocus
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-price" className="text-sm font-medium">
              Price (THB)
            </label>
            <Input
              id="np-price"
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

          <DialogFooter>
            <Button type="submit" disabled={submitting || name.trim().length < 2}>
              {submitting ? <Loader2 className="animate-spin" /> : <PackagePlus />}
              {submitting ? "Creating…" : "Create & stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
