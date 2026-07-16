"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB } from "@/lib/format"
import type { StockInItem } from "@/lib/stock-in"

type StockInListProps = {
  items: StockInItem[]
  mode?: "in" | "out"
  onInc: (id: number) => void
  onDec: (id: number) => void
  onSetQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
}

export function StockInList({
  items,
  mode = "in",
  onInc,
  onDec,
  onSetQty,
  onRemove,
}: StockInListProps) {
  const isOut = mode === "out"
  const projected = (item: StockInItem) =>
    isOut ? Math.max(0, item.currentStock - item.quantity) : item.currentStock + item.quantity

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        List is empty — scan or type a barcode to start.
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
            <TableHead className="text-center">Stock now → after</TableHead>
            <TableHead className="text-center">{isOut ? "Remove qty" : "Add qty"}</TableHead>
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
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {item.currentStock} → {projected(item)}
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
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantity}
                    onChange={(e) => onSetQty(item.id, Number(e.target.value))}
                    className="h-8 w-16 text-center tabular-nums"
                    aria-label={`Quantity for ${item.name}`}
                  />
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
