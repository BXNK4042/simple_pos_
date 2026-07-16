"use client"

import { useRouter } from "next/navigation"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type DashboardRangeFormProps = {
  initialFrom?: string
  initialTo?: string
}

/**
 * Native date inputs that drive the dashboard via searchParams. Two
 * `<input type="date">` (no lib) + Apply; clearing both returns to the
 * today-snapshot default. A single date = a daily report; both = a range.
 */
export function DashboardRangeForm({ initialFrom, initialTo }: DashboardRangeFormProps) {
  const router = useRouter()

  function submit(formData: FormData) {
    const from = String(formData.get("from") ?? "").trim()
    const to = String(formData.get("to") ?? "").trim()
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const qs = params.toString()
    router.push(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  function clear() {
    router.push("/dashboard")
  }

  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        From
        <Input
          type="date"
          name="from"
          defaultValue={initialFrom}
          className="h-9 w-40"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        To
        <Input
          type="date"
          name="to"
          defaultValue={initialTo}
          className="h-9 w-40"
        />
      </label>
      <Button type="submit" variant="accent" size="sm">
        <Calendar />
        Apply
      </Button>
      {(initialFrom || initialTo) && (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Today
        </Button>
      )}
    </form>
  )
}
