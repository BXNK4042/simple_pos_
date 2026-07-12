import { prisma } from "@/lib/prisma"
import { emitScan, type ScanResult } from "@/lib/scan-events"
import { authorizeScan } from "@/lib/auth"

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? "thb").toUpperCase()

export async function POST(request: Request) {
  // Called by the ESP32 (X-Device-Key) or the cashier browser (session cookie).
  const auth = await authorizeScan(request)
  if (!auth.ok) {
    return Response.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    )
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
    const product = await prisma.product.findUnique({ where: { barcode } })

    if(!product){
      const scanEvent: ScanResult = {
        barcode_status: "unknown",
        barcode,
        currency: CURRENCY
      }

      if (deviceId) {
        emitScan(scanEvent)
      }

      return Response.json(scanEvent)
    }

    const scan: ScanResult = {
      barcode_status: "ok",
      id: product.id,
      barcode: product.barcode ?? "",
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
