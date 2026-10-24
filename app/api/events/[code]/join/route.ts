import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { takeSeat } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const room = getHub().get(code)
  if (!room) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })

  let role: unknown
  try {
    role = (await request.json())?.role
  } catch {
    return json(400, { code: "room_failed", message: "La sala no pudo completar eso." })
  }
  if (role !== "speaker" && role !== "listener") {
    return json(400, { code: "room_failed", message: "La sala no pudo completar eso." })
  }

  const result = takeSeat(room, role)
  if (!result.ok) return json(409, { code: "speaker_taken", message: result.message })
  return json(200, { seatId: result.id })
}
