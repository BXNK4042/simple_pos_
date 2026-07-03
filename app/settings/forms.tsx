"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { firstError, postAuth } from "@/lib/auth-client"
import type { FieldErrors } from "@/lib/auth-client"

function Status({ state }: { state: { ok?: boolean; message?: string } }) {
  if (state.ok && state.message) {
    return <p className="text-sm text-emerald-600 dark:text-emerald-500">{state.message}</p>
  }
  if (state.message) {
    return <p className="text-sm text-destructive">{state.message}</p>
  }
  return null
}

export function ChangePasswordForm() {
  const [errors, setErrors] = useState<FieldErrors | undefined>()
  const [state, setState] = useState<{ ok?: boolean; message?: string }>({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setErrors(undefined)
    setState({})
    const fd = new FormData(e.currentTarget)
    const r = await postAuth("/api/auth/change-password", {
      currentPassword: String(fd.get("currentPassword") ?? ""),
      newPassword: String(fd.get("newPassword") ?? ""),
    })
    setPending(false)
    setErrors(r.errors)
    setState({ ok: r.ok, message: r.message })
    if (r.ok) e.currentTarget.reset()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        {firstError(errors, "currentPassword") ? (
          <p className="text-xs text-destructive">{firstError(errors, "currentPassword")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
        {firstError(errors, "newPassword") ? (
          <p className="text-xs text-destructive">{firstError(errors, "newPassword")}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          At least 8 characters with a letter, a number, and a special character.
        </p>
      </div>

      <Status state={state} />

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  )
}

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors | undefined>()
  const [state, setState] = useState<{ ok?: boolean; message?: string }>({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setErrors(undefined)
    setState({})
    const fd = new FormData(e.currentTarget)
    const r = await postAuth("/api/auth/change-email", {
      email: String(fd.get("email") ?? ""),
    })
    setPending(false)
    setErrors(r.errors)
    setState({ ok: r.ok, message: r.message })
    if (r.ok) router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" defaultValue={currentEmail} autoComplete="email" required />
        {firstError(errors, "email") ? (
          <p className="text-xs text-destructive">{firstError(errors, "email")}</p>
        ) : null}
      </div>

      <Status state={state} />

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving…" : "Update email"}
      </Button>
    </form>
  )
}
