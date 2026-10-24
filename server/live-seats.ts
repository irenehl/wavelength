import type { EventRoom, RoomSocket } from "./rooms"

const OPEN = 1
const LISTENER_GRACE_MS = 20_000
const SPEAKER_GRACE_MS = 30 * 60_000

export class LiveSeat implements RoomSocket {
  readyState = OPEN
  seatId = ""
  private emit: ((data: string | Buffer) => void) | null = null
  private queue: Array<string | Buffer> = []
  private leaveTimer: ReturnType<typeof setTimeout> | undefined
  private generation = 0

  constructor(
    private readonly room: EventRoom,
    readonly role: "speaker" | "listener",
  ) {}

  get roomCode() {
    return this.room.code
  }

  send(data: string | Buffer) {
    if (this.emit) {
      this.emit(data)
      return
    }
    this.queue.push(data)
    if (this.queue.length > 80) this.queue.shift()
  }

  attach(emit: (data: string | Buffer) => void) {
    this.clearLeave()
    this.emit = emit
    this.generation += 1
    for (const item of this.queue) emit(item)
    this.queue = []
    return this.generation
  }

  detach(generation?: number) {
    if (generation !== undefined && generation !== this.generation) return
    this.emit = null
    this.scheduleLeave()
  }

  keep() {
    if (this.emit || !this.leaveTimer) return
    this.scheduleLeave()
  }

  private scheduleLeave() {
    this.clearLeave()
    const grace = this.role === "speaker" ? SPEAKER_GRACE_MS : LISTENER_GRACE_MS
    this.leaveTimer = setTimeout(() => {
      this.room.leave(this.seatId)
      liveSeats.delete(this.seatId)
    }, grace)
    this.leaveTimer.unref?.()
  }

  private clearLeave() {
    clearTimeout(this.leaveTimer)
    this.leaveTimer = undefined
  }
}

export const liveSeats = new Map<string, LiveSeat>()

export function takeSeat(room: EventRoom, role: "speaker" | "listener", seatId?: string) {
  if (seatId) {
    const existing = liveSeats.get(seatId)
    if (existing && existing.roomCode === room.code && existing.role === role) {
      existing.keep()
      return { ok: true as const, id: existing.seatId }
    }
  }

  const socket = new LiveSeat(room, role)
  const result = room.join(socket, role)
  if (!result.ok) return result
  socket.seatId = result.id
  liveSeats.set(result.id, socket)
  return result
}
