import type { Metadata } from "next"
import { StockInPos } from "@/components/stock-in-pos"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Stock-in | POS System",
}

export default async function StockInPage() {
  await requireRole("owner")
  return <StockInPos />
}
