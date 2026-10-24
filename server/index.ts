import { createServer } from "node:http"
import { loadEnvConfig } from "@next/env"
import next from "next"
import { WebSocketServer, type RawData } from "ws"
import { normalizeCode } from "../lib/code"
import { getHub } from "./hub"

loadEnvConfig(process.cwd())

const port = Number(process.env.PORT || 38471)
const dev = process.env.NODE_ENV !== "production"
const hostname = "127.0.0.1"
const hub = getHub()

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (Array.isArray(data)) return Buffer.concat(data)
  return Buffer.from(data)
}

app.prepare().then(() => {
  const server = createServer((request, response) => {
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
          code: "event_missing",
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
            socket.send(
              JSON.stringify({
                type: "error",
                fatal: true,
                code: "speaker_taken",
                message: result.message,
              }),
            )
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
        socket.send(
          JSON.stringify({
            type: "error",
            code: "room_failed",
            message: "La sala no pudo completar eso.",
          }),
        )
      }
    })

    socket.on("close", () => {
      if (seatId) room.leave(seatId)
    })
  })

  server.listen(port, "0.0.0.0", () => {
    console.log(`Wavelength en http://127.0.0.1:${port}`)
  })
})
