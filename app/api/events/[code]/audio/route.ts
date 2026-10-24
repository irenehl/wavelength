import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { liveSeats } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const room = getHub().get(code)
  const seat = liveSeats.get(request.headers.get("x-seat-id") || "")
  if (!room || !seat) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })
  seat.keep()
  const pcm = Buffer.from(await request.arrayBuffer())
  if (pcm.length) room.appendAudio(seat.seatId, pcm)
  return json(200, { ok: true })
}
