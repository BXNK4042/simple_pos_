import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { productUpdateSchema } from "@/lib/schemas"

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireOwnerResponse()
  if (auth instanceof Response) return auth

  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return Response.json({ status: "error", message: "Invalid product ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid product"
    return Response.json({ status: "error", message: firstError }, { status: 400 })
  }

  const { sku, barcode, name, category, price, costPrice, isActive } = parsed.data

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: sku || null,
        barcode: barcode || null,
        name,
        category: category || null,
        price,
        costPrice,
        isActive,
      },
    })
    return Response.json({
      status: "ok",
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock,
      isActive: product.isActive,
      currency: CURRENCY,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      )
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { status: "error", message: `Barcode "${barcode}" already exists.` },
        { status: 409 }
      )
    }
    console.error("/api/products/[id] PUT error:", error)
    return Response.json(
      { status: "error", message: "Failed to update product" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireOwnerResponse()
  if (auth instanceof Response) return auth

  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return Response.json({ status: "error", message: "Invalid product ID" }, { status: 400 })
  }

  try {
    // Check if there are related transactions
    const relatedItems = await prisma.transactionItem.count({
      where: { productId: id },
    })

    if (relatedItems > 0) {
      return Response.json(
        { status: "error", message: "Cannot delete product with existing transactions." },
        { status: 409 }
      )
    }

    await prisma.product.delete({
      where: { id },
    })
    return Response.json({ status: "ok" })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      )
    }
    console.error("/api/products/[id] DELETE error:", error)
    return Response.json(
      { status: "error", message: "Failed to delete product" },
      { status: 500 }
    )
  }
}
