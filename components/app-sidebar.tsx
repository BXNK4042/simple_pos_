"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
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

const CASHIER_NAV: NavItem[] = [{ href: "/cashier", label: "Cashier", icon: ScanLine }]

function isActive(pathname: string, href: string): boolean {
  if (href === "/cashier") return pathname === "/cashier" || pathname.startsWith("/payment")
  return pathname === href || pathname.startsWith(href + "/")
}

export function AppSidebar({ user }: { user: SafeUser | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
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
    <Sidebar>
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={home}>
                <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm border border-sidebar-border">
                  <Image
                    src="/StoreMate_White.jpg"
                    alt="StoreMate Logo"
                    width={32}
                    height={32}
                    className="size-full object-contain p-0.5"
                  />
                </div>
                <span className="text-sm font-semibold tracking-tight">StoreMate</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {nav.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                isActive={isActive(pathname, href)}
                asChild
                onClick={() => setOpenMobile(false)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {showSettings && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive(pathname, "/settings")}
                asChild
                onClick={() => setOpenMobile(false)}
              >
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarSeparator />
        <div className="flex items-center gap-1 px-2 py-2">
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium">{user.name}</div>
            <Badge
              variant={user.role === "owner" ? "default" : "secondary"}
              className="mt-0.5 capitalize"
            >
              {user.role}
            </Badge>
          </div>
          <ThemeToggle />
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
