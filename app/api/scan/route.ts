import { prisma } from "@/lib/prisma"

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const rawBarcode =
    body && typeof body === "object" ? (body as Record<string, unknown>).barcode : undefined
  const barcode = rawBarcode === undefined ? "" : String(rawBarcode).trim()

  if (!barcode) {
    return Response.json(
      { status: "error", message: "barcode is required" },
      { status: 400 }
    )
  }

  try {
    let product = await prisma.product.findUnique({ where: { barcode } })

    if (!product) {
      product = await prisma.product.create({
        data: {
          barcode,
          name: `Unknown ${barcode}`,
          price: 0,
          stock: 0,
        },
      })
    }

    return Response.json({
      status: "ok",
      product: product.name,
      price: product.price,
      currency: CURRENCY,
    })
  } catch (error) {
    console.error("/api/scan error:", error)
    return Response.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    )
  }
}
