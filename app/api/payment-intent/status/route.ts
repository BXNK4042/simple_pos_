import { prisma } from "@/lib/prisma"
import { requireSessionResponse } from "@/lib/auth"

/**
 * Looks up a Transaction by id so the success page can confirm the webhook has
 * flipped it to "paid" (and poll briefly if it hasn't yet).
 */
export async function GET(request: Request) {
  const session = await requireSessionResponse()
  if (session instanceof Response) return session

  const url = new URL(request.url)
  const tid = Number(url.searchParams.get("tid"))
  if (!Number.isFinite(tid) || tid <= 0) {
    return Response.json({ status: "error", message: "Invalid tid" }, { status: 400 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: tid },
    select: {
      id: true,
      status: true,
      total: true,
      paymentMethod: true,
      amountTendered: true,
      createdAt: true,
      cashier: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          subtotal: true,
          product: { select: { name: true } },
        },
      },
    },
  })

  if (!transaction) {
    return Response.json({ status: "error", message: "Not found" }, { status: 404 })
  }

  return Response.json({ status: "ok", transaction })
}
