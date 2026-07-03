"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  buildHref,
  STATUS_OPTIONS,
  type ParsedQuery,
  type StatusFilter,
} from "@/lib/transactions"

type FiltersProps = {
  current: ParsedQuery
  total: number
}

export function TransactionsFilters({ current, total }: FiltersProps) {
  const router = useRouter()
  const [q, setQ] = useState(current.q)

  function applyStatus(value: StatusFilter) {
    router.push(buildHref(current, { status: value }, { resetPage: true }))
  }

  function applySearch(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = q.trim()
    if (trimmed === current.q) return
    router.push(buildHref(current, { q: trimmed }, { resetPage: true }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={applySearch} className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search receipt #, Stripe id, or product…"
            aria-label="Search transactions"
            className="pl-8"
          />
        </form>
        <span className="text-xs text-muted-foreground">
          {total} transaction{total === 1 ? "" : "s"}
        </span>
      </div>

      <Tabs value={current.status} onValueChange={(v) => applyStatus(v as StatusFilter)}>
        <TabsList>
          {STATUS_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.value} value={opt.value}>
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
