"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"
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

type SortKey = "name" | "barcode" | "price" | "stock"
type SortDir = "asc" | "desc"

type SortState = { key: SortKey; dir: SortDir }

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "barcode", label: "Barcode", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "stock", label: "Stock", align: "right" },
]

function compare(a: ProductRow, b: ProductRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name)
    case "barcode":
      return a.barcode.localeCompare(b.barcode)
    case "price":
      return a.price - b.price
    case "stock":
      return a.stock - b.stock
  }
}

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    )
  }, [products, query])

  const rows = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => compare(a, b, sort.key) * factor)
  }, [filtered, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    )
  }

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
              {COLUMNS.map((col) => {
                const active = sort.key === col.key
                const ariaSort = active
                  ? sort.dir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                const Icon = active
                  ? sort.dir === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown
                return (
                  <TableHead
                    key={col.key}
                    aria-sort={ariaSort}
                    className={col.align === "right" ? "text-right" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      aria-label={`Sort by ${col.label} ${
                        active
                          ? sort.dir === "asc"
                            ? "descending"
                            : "ascending"
                          : "ascending"
                      }`}
                      className={
                        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground " +
                        (active ? "text-foreground" : "text-muted-foreground") +
                        (col.align === "right" ? " flex-row-reverse" : "")
                      }
                    >
                      {col.label}
                      <Icon className="size-3.5" />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
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
            {rows.length === 0 && (
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
