import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { requireOwnerResponse } from "@/lib/auth"
import { createUserSchema } from "@/lib/schemas"

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

  const parsed = createUserSchema.safeParse({
    name: record.name,
    email: record.email,
    password: record.password,
    role: record.role ?? "cashier",
  })
  if (!parsed.success) {
    return Response.json(
      { status: "error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { name, email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json(
      { status: "error", errors: { email: ["That email is already in use."] } },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({ data: { name, email, passwordHash, role } })
  return Response.json({ status: "ok", message: `Created ${role} account for ${name}.` })
}
