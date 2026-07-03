import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductsTable, type ProductRow } from "@/components/products-table"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Products | POS System",
}

export default async function ProductsPage() {
  const rows = await prisma.product.findMany({
    select: { id: true, barcode: true, name: true, price: true, stock: true },
    orderBy: { name: "asc" },
  })

  const products: ProductRow[] = rows

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/" aria-label="Back home">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Catalog of all products. New items are auto-created on first scan.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ProductsTable products={products} />
      </div>
    </main>
  )
}
