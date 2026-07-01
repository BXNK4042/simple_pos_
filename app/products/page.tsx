import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProductsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage the product catalog (shadcn Table + Dialog) arrives in a later milestone.
        New products are auto-created on first scan.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  )
}
