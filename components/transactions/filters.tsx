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

  function applyRange(formData: FormData) {
    const from = String(formData.get("from") ?? "").trim()
    const to = String(formData.get("to") ?? "").trim()
    router.push(buildHref(current, { from, to }, { resetPage: true }))
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={current.status} onValueChange={(v) => applyStatus(v as StatusFilter)}>
          <TabsList>
            {STATUS_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form action={applyRange} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              name="from"
              defaultValue={current.from}
              className="h-9 w-38"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              name="to"
              defaultValue={current.to}
              className="h-9 w-38"
            />
          </label>
        </form>
      </div>
    </div>
  )
}
