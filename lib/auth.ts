import crypto from "node:crypto"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  decrypt,
  SESSION_COOKIE,
  type Role,
  type SessionPayload,
} from "@/lib/session"

export type SafeUser = {
  id: number
  email: string
  name: string
  role: Role
}

function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return decrypt(token)
}

/**
 * Server Components / pages: verifies the session and redirects to /login when
 * absent. Memoized per-request via React `cache`.
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const payload = await readSession()
  if (!payload) {
    redirect("/login")
  }
  return payload
})

/**
 * Returns the logged-in user (without the password hash) or null. Never
 * redirects — safe to call from public pages and the root layout. Memoized.
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const payload = await readSession()
  if (!payload) return null
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) return null
  if (user.role !== "owner" && user.role !== "cashier") return null
  return { ...user, role: user.role }
})

/**
 * Asserts the user holds `role`; otherwise redirects to a safe page.
 * Use in owner-only pages and Server Actions.
 */
export async function requireRole(role: Role): Promise<SessionPayload> {
  const payload = await verifySession()
  if (payload.role !== role) {
    redirect("/cashier")
  }
  return payload
}

// ---- Route-handler helpers (never redirect; return a Response on failure) ----

/** Read the session for an API route. Returns null when absent/invalid. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  return readSession()
}

/** Returns the payload, or a 401 Response if not authenticated. */
export async function requireSessionResponse(): Promise<Response | SessionPayload> {
  const payload = await getSessionPayload()
  if (!payload) {
    return Response.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    )
  }
  return payload
}

/** Returns the payload, or a 401/403 Response. */
export async function requireOwnerResponse(): Promise<Response | SessionPayload> {
  const res = await requireSessionResponse()
  if (res instanceof Response) return res
  if (res.role !== "owner") {
    return Response.json(
      { status: "error", message: "Forbidden" },
      { status: 403 }
    )
  }
  return res
}

/**
 * /api/scan is called by two clients: the ESP32 (which sends X-Device-Key and
 * device_id) and the cashier browser (manual lookup, authenticated by the
 * session cookie). Allow either.
 */
export async function authorizeScan(
  request: Request
): Promise<{ ok: true; payload: SessionPayload | null } | { ok: false }> {
  const payload = await getSessionPayload()
  if (payload) return { ok: true, payload }

  const deviceKey = process.env.DEVICE_KEY
  const provided = request.headers.get("x-device-key")
  if (deviceKey && provided && timingSafeEqualString(provided, deviceKey)) {
    return { ok: true, payload: null }
  }
  return { ok: false }
}
