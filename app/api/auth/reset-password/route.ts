import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { resetPasswordSchema } from "@/lib/schemas"

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

  const parsed = resetPasswordSchema.safeParse({
    userId: record.userId,
    newPassword: record.newPassword,
  })
  if (!parsed.success) {
    return Response.json(
      { status: "error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { userId, newPassword } = parsed.data

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return Response.json({ status: "error", message: "User not found." }, { status: 404 })
  }
  if (target.id === session.userId) {
    return Response.json(
      { status: "error", message: "Use Settings to change your own password." },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } })
  return Response.json({ status: "ok", message: `Password reset for ${target.name}.` })
}
