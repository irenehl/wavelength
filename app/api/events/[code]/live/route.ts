import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { liveSeats } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300
export const preferredRegion = ["iad1"]

const AUDIO_FRAME = 3200

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const seatId = new URL(request.url).searchParams.get("seatId") || ""
  const room = getHub().get(code)
  const seat = liveSeats.get(seatId)
  if (!room || !seat || seat.seatId !== seatId) {
    return json(404, { code: "event_missing", message: "No hay un evento con ese código." })
  }

  const encoder = new TextEncoder()
  let generation = 0
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let closed = false
  const stream = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        const fail = () => {
          if (closed) return
          closed = true
          clearInterval(heartbeat)
          seat.detach(generation)
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
        const deliver = (chunk: string) => {
          controller.enqueue(encoder.encode(chunk))
        }
        const replay = () => {
          const captions = room.captionReplay?.(seat.seatId) ?? []
          for (const message of captions) deliver(`data: ${JSON.stringify(message)}\n\n`)
        }
        try {
          // A first chunk larger than a proxy buffer makes the stream start flowing.
          deliver(`: ${" ".repeat(2048)}\n\n`)
        } catch {
          fail()
          return
        }

        generation = seat.attach((data) => {
          try {
            if (typeof data === "string") {
              deliver(`data: ${data}\n\n`)
              return
            }
            const bytes = Buffer.from(data)
            for (let offset = 0; offset < bytes.length; offset += AUDIO_FRAME) {
              const frame = bytes.subarray(offset, offset + AUDIO_FRAME)
              deliver(`data: ${JSON.stringify({ type: "audio", audio: frame.toString("base64") })}\n\n`)
            }
          } catch (error) {
            fail()
            throw error
          }
        })

        try {
          seat.flush()
          replay()
        } catch {
          // A bad snapshot must not close the only pipe to this listener.
        }

        let replayBeat = 0
        heartbeat = setInterval(() => {
          try {
            deliver(`data: ${JSON.stringify({ type: "ping" })}\n\n`)
            replayBeat += 1
            if (replayBeat % 2 === 0) replay()
          } catch {
            fail()
          }
        }, 2000)
        heartbeat.unref?.()
        request.signal.addEventListener("abort", () => {
          fail()
        })
      },
    },
    new CountQueuingStrategy({ highWaterMark: 200 }),
  )

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store, no-transform",
      "content-encoding": "identity",
      "x-accel-buffering": "no",
    },
  })
}
