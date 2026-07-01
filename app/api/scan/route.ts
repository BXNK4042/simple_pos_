import { prisma } from "@/lib/prisma"
import { emitScan, type ScanResult } from "@/lib/scan-events"

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

  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

  const barcode = record.barcode === undefined ? "" : String(record.barcode).trim()

  if (!barcode) {
    return Response.json(
      { status: "error", message: "barcode is required" },
      { status: 400 }
    )
  }

  const deviceId = record.device_id === undefined ? "" : String(record.device_id).trim()

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

    const scan: ScanResult = {
      id: product.id,
      barcode: product.barcode,
      product: product.name,
      price: product.price,
      stock: product.stock,
      currency: CURRENCY,
    }

    // Only hardware scanners (which send device_id) are broadcast over SSE.
    // Manual cashier entry (no device_id) is added to the cart from the response.
    if (deviceId) {
      emitScan(scan)
    }

    return Response.json({ status: "ok", ...scan })
  } catch (error) {
    console.error("/api/scan error:", error)
    return Response.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    )
  }
}
