"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { postAuth } from "@/lib/auth-client"

// TODO(testing): quick-fill helpers — comment out before production use.
const QUICK = {
  owner: { email: "owner@pos.local", password: "owner123!" },
  cashier: { email: "cashier@pos.local", password: "cashier123!" },
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setMessage(null)
    const r = await postAuth("/api/auth/login", { email, password })
    setPending(false)
    if (r.ok && r.role) {
      router.push(r.role === "owner" ? "/" : "/cashier")
      router.refresh()
    } else {
      setMessage(r.message ?? "Invalid email or password.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      {/* TODO(testing): quick sign-in buttons — comment out before production use. */}
      <div className="space-y-1.5 border-t pt-3">
        <p className="text-xs text-muted-foreground">Quick sign-in (testing)</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEmail(QUICK.owner.email)
              setPassword(QUICK.owner.password)
            }}
          >
            Owner
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEmail(QUICK.cashier.email)
              setPassword(QUICK.cashier.password)
            }}
          >
            Cashier
          </Button>
        </div>
      </div>
    </form>
  )
}
