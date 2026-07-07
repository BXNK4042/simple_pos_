"use client"

import Link from "next/link"
import { Banknote } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteTopBar() {
  return (
    <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <SidebarTrigger />
      <Link href="/" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground shadow-sm shadow-brand/40">
          <Banknote className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">POS</span>
      </Link>
    </div>
  )
}
