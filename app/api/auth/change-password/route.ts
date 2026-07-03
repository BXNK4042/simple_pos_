import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { changePasswordSchema } from "@/lib/schemas"

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

  const parsed = changePasswordSchema.safeParse({
    currentPassword: record.currentPassword,
    newPassword: record.newPassword,
  })
  if (!parsed.success) {
    return Response.json(
      { status: "error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { currentPassword, newPassword } = parsed.data
  const stored = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  })
  if (!stored) {
    return Response.json({ status: "error", message: "Account not found." }, { status: 404 })
  }

  const matched = await bcrypt.compare(currentPassword, stored.passwordHash)
  if (!matched) {
    return Response.json(
      { status: "error", errors: { currentPassword: ["Incorrect password."] } },
      { status: 400 }
    )
  }
  if (currentPassword === newPassword) {
    return Response.json(
      { status: "error", errors: { newPassword: ["New password must differ from the current one."] } },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } })
  return Response.json({ status: "ok", message: "Password updated." })
}
