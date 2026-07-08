import { cn } from "@/lib/utils"

// ponytail: width map instead of cva — 3 literals, grows when needed.
const WIDTHS = {
  "2xl": "max-w-7xl", // consistent width for 7xl
  "4xl": "max-w-7xl", // consistent width for 7xl
  "6xl": "max-w-7xl", // consistent width for 7xl
  "7xl": "max-w-7xl"
} as const

export function PageContainer({
  maxWidth = "7xl",
  className,
  children,
}: {
  maxWidth?: keyof typeof WIDTHS
  className?: string
  children: React.ReactNode
}) {
  return (
    <main id="main" className={cn("mx-auto w-full px-4 py-8", WIDTHS[maxWidth], className)}>
      {children}
    </main>
  )
}
