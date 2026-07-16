"use client"

import { useState } from "react"
import { Banknote, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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
import { formatTHB } from "@/lib/format"
import { useCart } from "@/lib/cart"

type CashTenderedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
}

const QUICK = [20, 50, 100, 500, 1000]

/**
 * Collects the cash amount tendered for a cash sale, POSTs to /api/pay-cash,
 * clears the cart, and sends the user to the shared success page. The cash
 * route finalises synchronously (no webhook), so the success page's first
 * status poll (~800ms) confirms the sale.
 *
 * The parent remounts this component (via `key`) each time the dialog opens,
 * so `tendered` starts fresh without a reset effect.
 */
export function CashTenderedDialog({ open, onOpenChange, total }: CashTenderedDialogProps) {
  const router = useRouter()
  const cart = useCart()
  const [tendered, setTendered] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const tenderedNum = Number(tendered)
  const valid = Number.isFinite(tenderedNum) && tenderedNum >= total
  const change = valid ? tenderedNum - total : 0

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/pay-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ id: i.id, quantity: i.quantity })),
          tendered: tenderedNum,
        }),
      })
      const data = (await res.json()) as {
        status?: string
        message?: string
        transactionId?: number
      }
      if (!res.ok || data.status !== "ok" || !data.transactionId) {
        toast.error(data.message ?? "Cash payment failed")
        return
      }
      cart.clear()
      onOpenChange(false)
      router.push(`/payment/success?tid=${data.transactionId}`)
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cash payment</DialogTitle>
          <DialogDescription>
            Total due <span className="font-semibold text-foreground">{formatTHB(total)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            inputMode="decimal"
            type="number"
            min={total}
            step="0.01"
            placeholder="Cash tendered"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {QUICK.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTendered(String(amt))}
              >
                {formatTHB(amt)}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTendered(String(total))}
            >
              Exact
            </Button>
          </div>
          {tendered !== "" && Number.isFinite(tenderedNum) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Change</span>
              <span className="tabular-nums font-medium">{formatTHB(change)}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={!valid || submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <Banknote />}
            {submitting ? "Recording…" : "Confirm cash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
