"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatTHB } from "@/lib/format"
import { isLow, isOut } from "@/lib/inventory"
import { EditProductDialog, type EditProduct } from "@/components/edit-product-dialog"
import { NewProductDialog, type NewProduct } from "@/components/new-product-dialog"
import { toast } from "sonner"

export type ProductRow = {
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

type SortKey = "name" | "sku" | "barcode" | "category" | "price" | "costPrice" | "stock" | "isActive"
type SortDir = "asc" | "desc"

type SortState = { key: SortKey; dir: SortDir }

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" | "center" }[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "sku", label: "SKU", align: "left" },
  { key: "barcode", label: "Barcode", align: "left" },
  { key: "category", label: "Category", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "costPrice", label: "Cost", align: "right" },
  { key: "stock", label: "Stock", align: "right" },
  { key: "isActive", label: "Status", align: "center" },
]

function compare(a: ProductRow, b: ProductRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name)
    case "sku":
      return (a.sku || "").localeCompare(b.sku || "")
    case "barcode":
      return (a.barcode || "").localeCompare(b.barcode || "")
    case "category":
      return (a.category || "").localeCompare(b.category || "")
    case "price":
      return a.price - b.price
    case "costPrice":
      return a.costPrice - b.costPrice
    case "stock":
      return a.stock - b.stock
    case "isActive":
      return (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1
  }
}

export function ProductsTable({ products: initialProducts }: { products: ProductRow[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" })
  
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
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

  function handleUpdated(updatedProduct: EditProduct) {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? { ...updatedProduct } : p))
    )
  }

  function handleCreated(newProduct: NewProduct) {
    setProducts((prev) => [newProduct, ...prev])
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Could not delete product")
        return
      }
      toast.success(`Deleted "${name}"`)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error("Network error")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, barcode, SKU…"
            aria-label="Search products"
            className="pl-8"
          />
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          Add Product
        </Button>
      </div>

      <div className="rounded-lg border border-border/70 overflow-x-auto">
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
                    className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : undefined}
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
                        "inline-flex items-center gap-1 text-xs font-medium tracking-wide transition-colors hover:text-foreground " +
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
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const out = isOut(p.stock)
              const low = isLow(p.stock)
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.sku || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.barcode || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.category || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTHB(p.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatTHB(p.costPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {out ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : low ? (
                      <Badge variant="warning">{p.stock}</Badge>
                    ) : (
                      <Badge variant="secondary">{p.stock}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.isActive ? (
                      <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setEditingProduct(p); setIsEditDialogOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(p.id, p.name)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-16 text-center text-sm text-muted-foreground">
                  No products match “{query.trim()}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditProductDialog
        product={editingProduct}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdated={handleUpdated}
      />

      <NewProductDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}
