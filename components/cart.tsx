"use client"

import { Minus, Plus, ScanLine, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB } from "@/lib/format"
import { type CartItem } from "@/lib/cart"

type CartProps = {
  items: CartItem[]
  onInc: (id: number) => void
  onDec: (id: number) => void
  onRemove: (id: number) => void
}

export function Cart({ items, onInc, onDec, onRemove }: CartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/50 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ScanLine className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium">Cart is empty</p>
          <p className="text-xs text-muted-foreground">
            Scan or search an item to start an order.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.barcode}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTHB(item.price)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() => onDec(item.id)}
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus />
                  </Button>
                  <span className="w-8 text-center tabular-nums">{item.quantity}</span>
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() => onInc(item.id)}
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTHB(item.price * item.quantity)}
              </TableCell>
              <TableCell>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
