"use client"

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type TopProduct = { name: string; units: number }

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

type TooltipProps = {
  active?: boolean
  payload?: { payload: TopProduct }[]
}

function UnitsTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">{item.name}</div>
      <div className="tabular-nums text-muted-foreground">{item.units} sold</div>
    </div>
  )
}

export function TopProducts({ data }: { data: TopProduct[] }) {
  const hasData = data.length > 0

  return (
    <Card className="h-full shadow-sm shadow-primary/5">
      <CardHeader>
        <CardTitle>Top products</CardTitle>
        <CardDescription>By units sold (all-time)</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<UnitsTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
            No sales recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
