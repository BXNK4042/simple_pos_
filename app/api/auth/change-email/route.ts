import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { changeEmailSchema } from "@/lib/schemas"

export async function POST(request: Request) {
  const session = await requireOwnerResponse()
  if (session instanceof Response) return session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON body" }, { status: 400 })
  }
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

  const parsed = changeEmailSchema.safeParse({ email: record.email })
  if (!parsed.success) {
    return Response.json(
      { status: "error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { email } = parsed.data

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  })
  if (!me) {
    return Response.json({ status: "error", message: "Account not found." }, { status: 404 })
  }
  if (email === me.email) {
    return Response.json(
      { status: "error", errors: { email: ["That is already your email."] } },
      { status: 400 }
    )
  }
  const clash = await prisma.user.findUnique({ where: { email } })
  if (clash) {
    return Response.json(
      { status: "error", errors: { email: ["That email is already in use."] } },
      { status: 400 }
    )
  }

  await prisma.user.update({ where: { id: session.userId }, data: { email } })
  return Response.json({ status: "ok", message: "Email updated." })
}
