import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { loadEnvConfig } from "@next/env"
import next from "next"
import { WebSocketServer, type RawData } from "ws"
import { normalizeCode } from "../lib/code"
import { EventHub } from "./rooms"
import { openTranslation } from "./translate"

loadEnvConfig(process.cwd())

const port = Number(process.env.PORT || 38471)
const dev = process.env.NODE_ENV !== "production"
const hostname = "127.0.0.1"
const apiKey = process.env.OPENAI_API_KEY?.trim() || ""

const hub = new EventHub({
  apiKeyConfigured: apiKey.length > 0,
  openTranslator: (language, transcribe, safetyId, handlers) =>
    openTranslation({ apiKey, language, transcribe, safetyId, ...handlers }),
})

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  response.end(JSON.stringify(body))
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > 4096) {
        reject(new Error("body too large"))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    request.on("error", reject)
  })
}

function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null
  const name = input.trim().replace(/\s+/g, " ")
  if (name.length < 1 || name.length > 60) return null
  return name
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (Array.isArray(data)) return Buffer.concat(data)
  return Buffer.from(data)
}

app.prepare().then(() => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

    if (request.method === "POST" && url.pathname === "/api/events") {
      try {
        const name = cleanName(JSON.parse(await readBody(request)).name)
        if (!name) {
          sendJson(response, 400, { message: "Ponle un nombre al evento." })
          return
        }
        sendJson(response, 201, hub.create(name).publicSnapshot())
      } catch {
        sendJson(response, 400, { message: "No pudimos crear el evento." })
      }
      return
    }

    const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/)
    if (request.method === "GET" && eventMatch) {
      const room = hub.get(decodeURIComponent(eventMatch[1] || ""))
      if (!room) {
        sendJson(response, 404, { message: "No hay un evento con ese código." })
        return
      }
      sendJson(response, 200, room.publicSnapshot())
      return
    }

    handle(request, response)
  })

  const sockets = new WebSocketServer({ noServer: true })

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost")
    if (url.pathname !== "/ws") return
    sockets.handleUpgrade(request, socket, head, (ws) => {
      sockets.emit("connection", ws, request)
    })
  })

  sockets.on("connection", (socket, request) => {
    const url = new URL(request.url || "/", "http://localhost")
    const room = hub.get(normalizeCode(url.searchParams.get("code") || ""))
    if (!room) {
      socket.send(
        JSON.stringify({
          type: "error",
          fatal: true,
          message: "No hay un evento con ese código.",
        }),
      )
      socket.close()
      return
    }

    let seatId: string | null = null

    socket.on("message", (data, isBinary) => {
      try {
        if (isBinary) {
          if (seatId) room.appendAudio(seatId, toBuffer(data))
          return
        }

        let message: { type?: string; role?: string; live?: boolean; language?: string }
        try {
          message = JSON.parse(data.toString()) as typeof message
        } catch {
          return
        }

        if (message.type === "join") {
          if (seatId) return
          if (message.role !== "speaker" && message.role !== "listener") return
          const result = room.join(socket, message.role)
          if (!result.ok) {
            socket.send(JSON.stringify({ type: "error", fatal: true, message: result.message }))
            socket.close()
            return
          }
          seatId = result.id
          return
        }

        if (!seatId) return
        if (message.type === "mic") room.setMic(seatId, Boolean(message.live))
        if (message.type === "listen" && typeof message.language === "string") {
          room.listen(seatId, message.language)
        }
      } catch (error) {
        console.error(error)
        socket.send(JSON.stringify({ type: "error", message: "La sala no pudo completar eso." }))
      }
    })

    socket.on("close", () => {
      if (seatId) room.leave(seatId)
    })
  })

  server.listen(port, "0.0.0.0", () => {
    console.log(`Puente en http://127.0.0.1:${port}`)
  })
})
