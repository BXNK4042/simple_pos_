"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteTopBar() {
  return (
    <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <SidebarTrigger />
    </div>
  )
}
