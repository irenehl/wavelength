import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { liveSeats } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300
export const preferredRegion = ["iad1"]

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const seatId = new URL(request.url).searchParams.get("seatId") || ""
  const room = getHub().get(code)
  const seat = liveSeats.get(seatId)
  if (!room || !seat || seat.seatId !== seatId) {
    return json(404, { code: "event_missing", message: "No hay un evento con ese código." })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          seat.detach()
        }
      }
      seat.attach((data) => {
        if (typeof data === "string") {
          send(`data: ${data}\n\n`)
          return
        }
        send(`event: audio\ndata: ${Buffer.from(data).toString("base64")}\n\n`)
      })
      request.signal.addEventListener("abort", () => {
        seat.detach()
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
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}
