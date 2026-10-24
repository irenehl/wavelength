import { cleanName } from "@/lib/event-name"
import { getHub } from "@/server/hub"
import { json } from "@/server/http"
import { takeSeat } from "@/server/live-seats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  let role: unknown
  let name: string | null = null
  let seatId: string | undefined
  try {
    const body = (await request.json()) as { role?: unknown; name?: unknown; seatId?: unknown }
    role = body.role
    name = cleanName(body.name)
    seatId = typeof body.seatId === "string" && body.seatId ? body.seatId : undefined
  } catch {
    return json(400, { code: "room_failed", message: "La sala no pudo completar eso." })
  }
  const room = name ? getHub().ensure(code, name) : getHub().get(code)
  if (!room) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })
  if (role !== "speaker" && role !== "listener") {
    return json(400, { code: "room_failed", message: "La sala no pudo completar eso." })
  }

  const result = takeSeat(room, role, seatId)
  if (!result.ok) return json(409, { code: "speaker_taken", message: result.message })
  return json(200, { seatId: result.id })
}
