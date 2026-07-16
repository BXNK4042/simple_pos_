import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PrintButton } from "@/components/transactions/print-button"
import { PageContainer } from "@/components/page-container"
import { prisma } from "@/lib/prisma"
import { formatTHB, formatDateTime } from "@/lib/format"
import { STATUS_BADGE_VARIANT, stripeDashboardUrl, type TxnStatus } from "@/lib/transactions"
import { requireRole } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireRole("owner")
  const tid = Number(id)
  if (!Number.isFinite(tid) || tid <= 0) notFound()

  const transaction = await prisma.transaction.findUnique({
    where: { id: tid },
    select: {
      id: true,
      total: true,
      status: true,
      paymentMethod: true,
      amountTendered: true,
      stripePaymentId: true,
      createdAt: true,
      cashier: { select: { name: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          subtotal: true,
          product: { select: { name: true, barcode: true } },
        },
      },
    },
  })

  if (!transaction) notFound()

  const status = transaction.status as TxnStatus
  const stripeUrl = stripeDashboardUrl(transaction.stripePaymentId)
  const isCash = transaction.paymentMethod === "cash"
  const change =
    isCash && transaction.amountTendered != null
      ? transaction.amountTendered - transaction.total
      : null

  return (
    <PageContainer maxWidth="2xl">
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/transactions">
            <ArrowLeft />
            Back to transactions
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="print-receipt">
        <Card className="shadow-sm shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Receipt #{transaction.id}</span>
              <Badge variant={STATUS_BADGE_VARIANT[status]} className="capitalize">{status}</Badge>
            </CardTitle>
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <div className="tabular-nums">{formatDateTime(transaction.createdAt)} (Bangkok time)</div>
              <div className="flex items-center gap-2">
                <span className="capitalize">{transaction.paymentMethod}</span>
                {transaction.cashier ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Cashier: {transaction.cashier.name}</span>
                  </>
                ) : null}
              </div>
              {transaction.stripePaymentId ? (
                <div className="no-print font-mono text-xs">
                  {stripeUrl ? (
                    <a
                      href={stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {transaction.stripePaymentId}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    transaction.stripePaymentId
                  )}
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {transaction.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This transaction has no line items.
              </p>
            ) : (
              <div className="rounded-lg border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transaction.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.product.barcode}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTHB(item.subtotal / item.quantity)}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatTHB(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

          {isCash && transaction.amountTendered != null ? (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash tendered</span>
                <span className="tabular-nums">{formatTHB(transaction.amountTendered)}</span>
              </div>
              {change != null ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change</span>
                  <span className="tabular-nums font-medium">{formatTHB(change)}</span>
                </div>
              ) : null}
            </>
          ) : null}

          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatTHB(transaction.total)}</span>
          </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
