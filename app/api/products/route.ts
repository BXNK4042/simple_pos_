import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireOwnerResponse, requireSessionResponse } from "@/lib/auth"
import { productCreateSchema } from "@/lib/schemas"

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()

type ProductResponse = {
  status: "ok"
  id: number
  sku: string | null
  barcode: string | null
  name: string
  category: string | null
  price: number
  costPrice: number
  stock: number
  isActive: boolean
  currency: string
}

function toResponse(row: {
  id: number
  sku: string | null
  barcode: string | null
  name: string
  category: string | null
  price: number
  costPrice: number
  stock: number
  isActive: boolean
}): ProductResponse {
  return {
    status: "ok",
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    category: row.category,
    price: row.price,
    costPrice: row.costPrice,
    stock: row.stock,
    isActive: row.isActive,
    currency: CURRENCY,
  }
}

/**
 * GET /api/products?q=<text>     — search (contains on name OR barcode, top 8).
 * GET /api/products?barcode=<code> — exact lookup. Deliberately does NOT
 * auto-create unknown barcodes (unlike /api/scan); the caller decides what to
 * do when a product is missing.
 *
 * Read access is session-scoped (any logged-in user) so the cashier screen can
 * power its suggestion dropdown. `q` takes precedence over `barcode` if both
 * are sent; if neither is sent, 400.
 */
export async function GET(request: Request) {
  const auth = await requireSessionResponse()
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const barcode = url.searchParams.get("barcode")?.trim() ?? ""

  if (q) {
    const items = await prisma.product.findMany({
      where: {
        OR: [{ name: { contains: q } }, { barcode: { contains: q } }],
      },
      take: 8,
      orderBy: { name: "asc" },
      select: { 
        id: true, 
        sku: true,
        barcode: true, 
        name: true, 
        category: true,
        price: true, 
        costPrice: true,
        stock: true,
        isActive: true
      },
    })
    return Response.json({ status: "ok", items })
  }

  if (barcode) {
    const product = await prisma.product.findUnique({ where: { barcode } })
    if (!product) {
      return Response.json({ status: "not_found" }, { status: 404 })
    }
    return Response.json(toResponse(product))
  }

  return Response.json(
    { status: "error", message: "Provide a `q` (search) or `barcode` (exact) query param." },
    { status: 400 }
  )
}

/**
 * POST /api/products — owner-only. Creates a new product. Rejects duplicate
 * barcodes (P2002 -> 409).
 */
export async function POST(request: Request) {
  const auth = await requireOwnerResponse()
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsed = productCreateSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid product"
    return Response.json({ status: "error", message: firstError }, { status: 400 })
  }

  const { sku, barcode, name, category, price, costPrice, isActive, initialStock } = parsed.data

  try {
    const product = await prisma.product.create({
      data: { 
        sku: sku || null,
        barcode: barcode || null, 
        name, 
        category: category || null,
        price, 
        costPrice,
        isActive,
        stock: initialStock 
      },
    })
    return Response.json(toResponse(product), { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { status: "error", message: `Barcode "${barcode}" already exists.` },
        { status: 409 }
      )
    }
    console.error("/api/products POST error:", error)
    return Response.json(
      { status: "error", message: "Failed to create product" },
      { status: 500 }
    )
  }
}
