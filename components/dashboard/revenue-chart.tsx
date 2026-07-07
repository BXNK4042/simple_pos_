"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB } from "@/lib/format"

export type RevenuePoint = { label: string; revenue: number }

type TooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function RevenueTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">{label}</div>
      <div className="tabular-nums text-muted-foreground">{formatTHB(payload[0].value)}</div>
    </div>
  )
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const hasData = data.some((d) => d.revenue > 0)

  return (
    <Card className="h-full shadow-sm shadow-primary/5">
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
        <CardDescription>Last 7 days (paid orders)</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="100%" stopColor="var(--chart-3)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => formatTHB(v)}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#revenueStroke)"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
            No paid orders in the last 7 days yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
