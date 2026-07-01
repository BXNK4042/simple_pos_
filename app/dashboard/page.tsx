import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revenue, items sold, and low-stock alerts (Recharts) arrive in a later milestone.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  )
}
