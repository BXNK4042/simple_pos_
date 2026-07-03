import { CashierPos } from "@/components/cashier-pos"
import { verifySession } from "@/lib/auth"

export default async function CashierPage() {
  await verifySession()
  return <CashierPos />
}
