import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildHref, type ParsedQuery } from "@/lib/transactions"

type PaginationProps = {
  current: ParsedQuery
  totalPages: number
}

export function TransactionsPagination({ current, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null

  const page = current.page
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(current, { page: Math.max(1, page - 1) })}>
              <ChevronLeft />
              Prev
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            Prev
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(current, { page: Math.min(totalPages, page + 1) })}>
              Next
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  )
}
