"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB } from "@/lib/format"

export type ProductRow = {
  id: number
  barcode: string
  name: string
  price: number
  stock: number
}

const LOW_STOCK = 5

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    )
  }, [products, query])

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No products yet — they are auto-created on first scan.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or barcode…"
          aria-label="Search products"
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const out = p.stock <= 0
              const low = !out && p.stock <= LOW_STOCK
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.barcode}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTHB(p.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {out ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : low ? (
                      <Badge variant="destructive">{p.stock}</Badge>
                    ) : (
                      <Badge variant="secondary">{p.stock}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">
                  No products match “{query.trim()}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
