import { cleanName } from "@/lib/event-name"
import { getHub } from "@/server/hub"
import { json } from "@/server/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const preferredRegion = ["iad1"]

export async function POST(request: Request) {
  try {
    const name = cleanName((await request.json())?.name)
    if (!name) return json(400, { code: "name_required", message: "Ponle un nombre al evento." })
    return json(201, getHub().create(name).publicSnapshot())
  } catch {
    return json(400, { code: "create_failed", message: "No pudimos crear el evento." })
  }
}
