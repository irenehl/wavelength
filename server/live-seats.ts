import type { EventRoom, RoomSocket } from "./rooms"

const OPEN = 1
const LISTENER_GRACE_MS = 10 * 60_000
const SPEAKER_GRACE_MS = 30 * 60_000

export class LiveSeat implements RoomSocket {
  readyState = OPEN
  seatId = ""
  private emit: ((data: string | Buffer) => void) | null = null
  private textQueue: string[] = []
  private audioQueue: Buffer[] = []
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
      try {
        this.emit(data)
        return
      } catch {
        // The stream died. Keep the payload so the next connection can catch up.
        this.detach()
      }
    }
    if (typeof data === "string") {
      this.textQueue.push(data)
      if (this.textQueue.length > 40) this.textQueue.shift()
      return
    }
    this.audioQueue.push(Buffer.from(data))
    if (this.audioQueue.length > 8) this.audioQueue.shift()
  }

  attach(emit: (data: string | Buffer) => void) {
    this.clearLeave()
    this.emit = emit
    this.generation += 1
    return this.generation
  }

  flush() {
    const pending: Array<string | Buffer> = [...this.textQueue, ...this.audioQueue]
    this.textQueue = []
    this.audioQueue = []
    for (const item of pending) this.send(item)
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

const globalForSeats = globalThis as typeof globalThis & { __wavelengthSeats?: Map<string, LiveSeat> }

export const liveSeats = globalForSeats.__wavelengthSeats ?? new Map<string, LiveSeat>()
globalForSeats.__wavelengthSeats = liveSeats

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
