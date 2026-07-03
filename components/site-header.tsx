"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SafeUser } from "@/lib/auth"

export function SiteHeader({ user }: { user: SafeUser | null }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if (!user) return null
  const home = user.role === "owner" ? "/" : "/cashier"

  async function handleLogout() {
    setPending(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      setPending(false)
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
      <Link
        href={home}
        className="text-sm font-semibold tracking-tight hover:opacity-80"
      >
        POS System
      </Link>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          {/*<div className="text-sm font-medium">{user.name}</div>*/}
          <Badge
            variant={user.role === "owner" ? "default" : "secondary"}
            className="mt-0.5 capitalize"
          >
            {user.role}
          </Badge>
        </div>
        <Button onClick={handleLogout} variant="ghost" size="sm" disabled={pending}>
          <LogOut />
          {pending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </header>
  )
}
