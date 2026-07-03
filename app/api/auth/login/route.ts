import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { createSession, type Role } from "@/lib/session"
import { loginSchema } from "@/lib/schemas"

function isRole(value: string): value is Role {
  return value === "owner" || value === "cashier"
}

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
  const parsed = loginSchema.safeParse({
    email: record.email,
    password: record.password,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return Response.json(
      { status: "error", message: fe.email?.[0] ?? fe.password?.[0] ?? "Invalid input." },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  // Constant-ish failure path: still run a compare to limit timing leakage.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinv"
  const matched = await bcrypt.compare(password, hash)
  if (!user || !isRole(user.role) || !matched) {
    return Response.json(
      { status: "error", message: "Invalid email or password." },
      { status: 401 }
    )
  }

  await createSession(user.id, user.role)
  return Response.json({ status: "ok", role: user.role })
}
