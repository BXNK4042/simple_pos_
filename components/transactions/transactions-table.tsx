import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTHB, formatDateTime } from "@/lib/format"
import {
  buildHref,
  STATUS_BADGE_VARIANT,
  type ParsedQuery,
  type SortKey,
  type TxnStatus,
} from "@/lib/transactions"

export type TransactionRow = {
  id: number
  createdAt: Date
  status: TxnStatus
  total: number
  itemCount: number
}

type Column = { key: SortKey; label: string }

const COLUMNS: Column[] = [
  { key: "date", label: "Date" },
  { key: "total", label: "Total" },
  { key: "status", label: "Status" },
]

type TransactionsTableProps = {
  rows: TransactionRow[]
  current: ParsedQuery
  emptyMessage: string
}

export function TransactionsTable({ rows, current, emptyMessage }: TransactionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  function SortLink({ col, children }: { col: Column; children: React.ReactNode }) {
    const active = current.sort === col.key
    const dir = active && current.dir === "asc" ? "desc" : "asc"
    const Icon = active ? (current.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <Link
        href={buildHref(current, { sort: col.key, dir }, { resetPage: true })}
        aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : "none"}
        className={
          "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground " +
          (active ? "text-foreground" : "text-muted-foreground")
        }
      >
        {children}
        <Icon className="size-3.5" />
      </Link>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Receipt #</TableHead>
            {COLUMNS.map((col) => (
              <TableHead key={col.key} className="text-center">
                <SortLink col={col}>{col.label}</SortLink>
              </TableHead>
            ))}
            <TableHead className="text-center">Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="relative">
              <TableCell className="text-center">
                <Link
                  href={`/transactions/${row.id}`}
                  aria-label={`View receipt #${row.id}`}
                  className="absolute inset-0 z-10"
                />
                <span className="font-medium">#{row.id}</span>
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatTHB(row.total)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {row.itemCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
