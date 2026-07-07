import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProductsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 space-y-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
