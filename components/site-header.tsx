"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Banknote,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  ReceiptText,
  ScanLine,
  Settings,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { SafeUser } from "@/lib/auth"

type NavItem = {
  href: string
  label: string
  icon: typeof ScanLine
}

const OWNER_NAV: NavItem[] = [
  { href: "/cashier", label: "Cashier", icon: ScanLine },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/stock-in", label: "Stock-in", icon: PackagePlus },
  { href: "/users", label: "Users", icon: Users },
]

const CASHIER_NAV: NavItem[] = [
  { href: "/cashier", label: "Cashier", icon: ScanLine },
]

const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/cashier") return pathname === "/cashier" || pathname.startsWith("/payment")
  return pathname === href || pathname.startsWith(href + "/")
}

export function SiteHeader({ user }: { user: SafeUser | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = useState(false)

  if (!user) return null
  const home = user.role === "owner" ? "/" : "/cashier"
  const nav = user.role === "owner" ? OWNER_NAV : CASHIER_NAV
  const showSettings = user.role === "owner"

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4">
        <Link
          href={home}
          className="flex shrink-0 items-center gap-2 rounded-md py-1 transition-opacity hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground shadow-sm shadow-brand/40">
            <Banknote className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">POS</span>
        </Link>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <span className="absolute -bottom-[calc(0.5rem+1px)] left-2.5 right-2.5 h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {showSettings && (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              aria-label="Account settings"
              className={cn(isActive(pathname, SETTINGS_NAV.href) && "text-foreground")}
            >
              <Link href="/settings">
                <Settings className="size-4" />
              </Link>
            </Button>
          )}

          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs font-medium">{user.name}</div>
            <Badge
              variant={user.role === "owner" ? "default" : "secondary"}
              className="mt-0.5 capitalize"
            >
              {user.role}
            </Badge>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label="Sign out"
          >
            <LogOut />
            <span className="hidden sm:inline">
              {pending ? "Signing out…" : "Sign out"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}
