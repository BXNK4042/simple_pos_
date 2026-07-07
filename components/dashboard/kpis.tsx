import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type Kpi = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: "default" | "warning"
  featured?: boolean
}

export function DashboardKpis({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ label, value, hint, icon: Icon, tone, featured }) => (
        <Card
          key={label}
          className="relative overflow-hidden shadow-sm shadow-primary/5"
        >
          {featured && (
            <div
              aria-hidden
              className="absolute -top-12 -right-12 size-32 rounded-full bg-brand/10 blur-2xl"
            />
          )}
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{label}</span>
              <Icon
                className={cn(
                  "size-4",
                  tone === "warning"
                    ? "text-warning"
                    : featured
                      ? "text-brand"
                      : "text-muted-foreground"
                )}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </div>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
