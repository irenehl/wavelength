import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { liveSeats } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const room = getHub().get(code)
  if (!room) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })

  let body: { seatId?: string; type?: string; live?: boolean; language?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json(400, { code: "room_failed", message: "La sala no pudo completar eso." })
  }

  const seat = liveSeats.get(body.seatId || "")
  if (!seat) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })

  seat.keep()
  if (body.type === "mic") room.setMic(seat.seatId, Boolean(body.live))
  if (body.type === "listen" && typeof body.language === "string") room.listen(seat.seatId, body.language)
  return json(200, { ok: true })
}
