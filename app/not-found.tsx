import Link from "next/link"
import { Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-24">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-6 flex size-14 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
          <Banknote className="size-7" />
        </span>
        <p className="text-sm font-semibold tracking-wider text-brand uppercase">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button asChild variant="accent" className="mt-6">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
