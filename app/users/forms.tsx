"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { firstError, postAuth } from "@/lib/auth-client"
import type { FieldErrors } from "@/lib/auth-client"

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function CreateUserForm() {
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
    const r = await postAuth("/api/auth/users", {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      role: String(fd.get("role") ?? "cashier"),
    })
    setPending(false)
    setErrors(r.errors)
    setState({ ok: r.ok, message: r.message })
    if (r.ok) {
      e.currentTarget.reset()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input id="name" name="name" required />
        {firstError(errors, "name") ? (
          <p className="text-xs text-destructive">{firstError(errors, "name")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="off" required />
        {firstError(errors, "email") ? (
          <p className="text-xs text-destructive">{firstError(errors, "email")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {firstError(errors, "password") ? (
          <p className="text-xs text-destructive">{firstError(errors, "password")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium">Role</label>
        <select id="role" name="role" defaultValue="cashier" className={selectClass}>
          <option value="cashier">Cashier</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Creating…" : "Create account"}
        </Button>
        {state.ok && state.message ? (
          <p className="text-sm text-success">{state.message}</p>
        ) : null}
        {state.message && !state.ok ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
      </div>
    </form>
  )
}

export function ResetPasswordForm({
  userId,
  userName,
}: {
  userId: number
  userName: string
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setFeedback(null)
    const fd = new FormData(e.currentTarget)
    const r = await postAuth("/api/auth/reset-password", {
      userId: String(userId),
      newPassword: String(fd.get("newPassword") ?? ""),
    })
    setPending(false)
    if (r.ok) {
      setFeedback({ ok: true, message: "Password reset." })
      e.currentTarget.reset()
    } else {
      setFeedback({ ok: false, message: r.message ?? firstError(r.errors, "newPassword") ?? "Could not reset." })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1 space-y-1.5">
        <label htmlFor={`reset-${userId}`} className="text-xs font-medium">
          New password
        </label>
        <Input
          id={`reset-${userId}`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder={`Reset ${userName}`}
          required
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Resetting…" : "Reset"}
      </Button>
      {feedback ? (
        <p className={feedback.ok
          ? "text-xs text-success"
          : "text-xs text-destructive"}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  )
}
