import { cleanName } from "@/lib/event-name"
import { getHub } from "@/server/hub"
import { json } from "@/server/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const name = cleanName(new URL(request.url).searchParams.get("name"))
  const room = name ? getHub().ensure(code, name) : getHub().get(code)
  if (!room) return json(404, { code: "event_missing", message: "No hay un evento con ese código." })
  return json(200, room.publicSnapshot())
}
