import type { Metadata } from "next"
import { ProductsTable, type ProductRow } from "@/components/products-table"
import { PageContainer } from "@/components/page-container"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Products",
}

export default async function ProductsPage() {
  await requireRole("owner")
  const rows = await prisma.product.findMany({
    select: { id: true, barcode: true, name: true, price: true, stock: true },
    orderBy: { name: "asc" },
  })

  const products: ProductRow[] = rows

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Catalog of all products. New items are auto-created on first scan.
        </p>
      </div>

      <div className="mt-6">
        <ProductsTable products={products} />
      </div>
    </PageContainer>
  )
}
