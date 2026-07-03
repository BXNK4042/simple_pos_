"use client"

export type FieldErrors = Record<string, string[]>
export type Role = "owner" | "cashier"

export type AuthResult = {
  ok: boolean
  message?: string
  errors?: FieldErrors
  role?: Role
}

/**
 * Posts JSON to an auth route handler and normalizes the response. Network
 * errors are reported as a user-facing message instead of throwing.
 */
export async function postAuth(path: string, data: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as {
      status?: string
      message?: string
      errors?: FieldErrors
      role?: Role
    }
    return {
      ok: res.ok && json.status === "ok",
      message: json.message,
      errors: json.errors,
      role: json.role,
    }
  } catch {
    return { ok: false, message: "Network error. Please try again." }
  }
}

export function firstError(errors?: FieldErrors, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = errors?.[k]?.[0]
    if (v) return v
  }
  return undefined
}
