import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

export type Role = "owner" | "cashier"

export type SessionPayload = {
  userId: number
  role: Role
}

export const SESSION_COOKIE = "pos_session"
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 1 day

function encodedKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`."
    )
  }
  return new TextEncoder().encode(secret)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedKey())
}

export async function decrypt(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey(), {
      algorithms: ["HS256"],
    })
    const userId = Number(payload.userId)
    const role = payload.role
    if (!Number.isFinite(userId) || (role !== "owner" && role !== "cashier")) {
      return null
    }
    return { userId, role }
  } catch {
    return null
  }
}

export async function createSession(userId: number, role: Role): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_MS
  const token = await encrypt({ userId, role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
