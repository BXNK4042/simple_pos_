import { subscribeScan } from "@/lib/scan-events"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"))

      const unsubscribe = subscribeScan((scan) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(scan)}\n\n`))
      })

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"))
      }, 15000)

      request.signal.addEventListener("abort", () => {
        clearInterval(ping)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
