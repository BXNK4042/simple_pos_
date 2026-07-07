import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB } from "@/lib/format"
import { isOut, LOW_STOCK } from "@/lib/inventory"

export type LowStockRow = {
  id: number
  name: string
  barcode: string
  price: number
  stock: number
}

export function LowStockTable({ rows }: { rows: LowStockRow[] }) {
  const hasRows = rows.length > 0

  return (
    <Card className="h-full shadow-sm shadow-primary/5">
      <CardHeader>
        <CardTitle>Low-stock alerts</CardTitle>
        <CardDescription>
          Products with {LOW_STOCK} or fewer units in stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasRows ? (
          <div className="rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.barcode}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTHB(row.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOut(row.stock) ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : (
                        <Badge variant="warning">{row.stock}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
            Everything is well stocked.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
