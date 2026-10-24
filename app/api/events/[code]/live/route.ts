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
      let generation = 0
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          seat.detach(generation)
        }
      }
      generation = seat.attach((data) => {
        if (typeof data === "string") {
          send(`data: ${data}\n\n`)
          return
        }
        const bytes = Buffer.from(data)
        const frame = 2400
        for (let offset = 0; offset < bytes.length; offset += frame) {
          send(`data: ${JSON.stringify({ type: "audio", audio: bytes.subarray(offset, offset + frame).toString("base64") })}\n\n`)
        }
      })
      const heartbeat = setInterval(() => send(": keepalive\n\n"), 2000)
      heartbeat.unref?.()
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        seat.detach(generation)
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
