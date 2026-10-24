import type { EventRoom, RoomSocket } from "./rooms"

const OPEN = 1
const GRACE_MS = 20_000

export class LiveSeat implements RoomSocket {
  readyState = OPEN
  seatId = ""
  private emit: ((data: string | Buffer) => void) | null = null
  private queue: Array<string | Buffer> = []
  private leaveTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly room: EventRoom) {}

  send(data: string | Buffer) {
    if (this.emit) {
      this.emit(data)
      return
    }
    this.queue.push(data)
    if (this.queue.length > 80) this.queue.shift()
  }

  attach(emit: (data: string | Buffer) => void) {
    clearTimeout(this.leaveTimer)
    this.leaveTimer = undefined
    this.emit = emit
    for (const item of this.queue) emit(item)
    this.queue = []
  }

  detach() {
    this.emit = null
    clearTimeout(this.leaveTimer)
    this.leaveTimer = setTimeout(() => {
      this.room.leave(this.seatId)
      liveSeats.delete(this.seatId)
    }, GRACE_MS)
  }
}

export const liveSeats = new Map<string, LiveSeat>()

export function takeSeat(room: EventRoom, role: "speaker" | "listener") {
  const socket = new LiveSeat(room)
  const result = room.join(socket, role)
  if (!result.ok) return result
  socket.seatId = result.id
  liveSeats.set(result.id, socket)
  return result
}
