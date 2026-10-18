import { randomUUID } from "node:crypto"
import { generateCode, normalizeCode } from "../lib/code"
import type { EventPublic, ListenerCount, RoomSnapshot, ServerMessage } from "../lib/protocol"
import { isOutputLanguage } from "../lib/languages"
import { languagesNeeded, pickTranscriber } from "../lib/session-plan"
import type { OpenTranslator, TranslationHandlers, Translator } from "./translator"

const OPEN = 1
const MAX_PREROLL_BYTES = 24000 * 2 * 0.4
const MAX_DROPS = 3

export interface RoomSocket {
  send(data: string | Buffer): void
  readyState: number
}

type Seat = {
  id: string
  socket: RoomSocket
  role: "speaker" | "listener"
  language: string | null
  listening: boolean
}

type LiveSession = {
  language: string
  transcribe: boolean
  closing: boolean
  translator: Translator
}

export class EventRoom {
  readonly code: string
  readonly name: string
  readonly apiKeyConfigured: boolean
  private readonly seats = new Map<string, Seat>()
  private readonly sessions = new Map<string, LiveSession>()
  private readonly failures = new Map<string, number>()
  private readonly openTranslator: OpenTranslator
  private micLive = false
  private transcriber: string | null = null
  private preroll: Buffer[] = []
  private prerollBytes = 0

  constructor(options: {
    code: string
    name: string
    apiKeyConfigured: boolean
    openTranslator: OpenTranslator
  }) {
    this.code = options.code
    this.name = options.name
    this.apiKeyConfigured = options.apiKeyConfigured
    this.openTranslator = options.openTranslator
  }

  publicSnapshot(): EventPublic {
    return {
      code: this.code,
      name: this.name,
      speakerPresent: this.speaker() !== undefined,
      micLive: this.micLive,
      apiKeyConfigured: this.apiKeyConfigured,
      waiting: this.waitingCount(),
      listenerCounts: this.listenerCounts(),
    }
  }

  join(socket: RoomSocket, role: "speaker" | "listener"): { ok: true; id: string } | { ok: false; message: string } {
    if (role === "speaker" && this.speaker()) {
      return { ok: false, message: "Ya hay alguien con el micrófono de este evento." }
    }
    const seat: Seat = {
      id: randomUUID(),
      socket,
      role,
      language: null,
      listening: false,
    }
    this.seats.set(seat.id, seat)
    this.broadcastRoom()
    return { ok: true, id: seat.id }
  }

  setMic(id: string, live: boolean) {
    const seat = this.seats.get(id)
    if (!seat || seat.role !== "speaker") return
    this.micLive = live
    if (!live) {
      this.preroll = []
      this.prerollBytes = 0
    }
    if (live && !this.apiKeyConfigured) {
      this.send(seat, {
        type: "error",
        code: "missing_key",
        message:
          "Falta la llave de OpenAI. El evento está abierto, pero la traducción no arranca hasta configurar OPENAI_API_KEY.",
      })
    }
    this.syncSessions("user")
    this.broadcastRoom()
  }

  listen(id: string, language: string) {
    const seat = this.seats.get(id)
    if (!seat || seat.role !== "listener") return
    if (!isOutputLanguage(language)) {
      this.send(seat, {
        type: "error",
        code: "language_unavailable",
        message: "Ese idioma no está disponible.",
      })
      return
    }
    const changed = seat.language !== language || !seat.listening
    seat.language = language
    seat.listening = true
    if (changed) {
      this.send(seat, {
        type: "transcript",
        side: "translation",
        delta: "",
        done: false,
        reset: true,
      })
    }
    this.syncSessions("user")
    this.broadcastRoom()
  }

  leave(id: string) {
    const seat = this.seats.get(id)
    if (!seat) return
    this.seats.delete(id)
    if (seat.role === "speaker") {
      this.micLive = false
      this.preroll = []
      this.prerollBytes = 0
    }
    this.syncSessions("user")
    this.broadcastRoom()
  }

  appendAudio(id: string, pcm: Buffer) {
    const seat = this.seats.get(id)
    if (!seat || seat.role !== "speaker" || !this.micLive || pcm.length === 0) return
    this.remember(pcm)
    for (const session of this.sessions.values()) session.translator.append(pcm)
  }

  private syncSessions(reason: "user" | "drop") {
    if (reason === "user") this.failures.clear()
    const needed = this.apiKeyConfigured
      ? languagesNeeded({
          micLive: this.micLive,
          speakerConnected: this.speaker() !== undefined,
          listeners: [...this.seats.values()]
            .filter((seat) => seat.role === "listener")
            .map((seat) => ({ language: seat.language, listening: seat.listening })),
        })
      : []

    for (const language of [...this.sessions.keys()]) {
      if (!needed.includes(language)) this.closeLanguage(language)
    }

    this.transcriber = pickTranscriber(needed, this.transcriber)

    for (const language of needed) {
      const existing = this.sessions.get(language)
      const shouldTranscribe = language === this.transcriber
      if (!existing) {
        if ((this.failures.get(language) ?? 0) >= MAX_DROPS) continue
        const session = this.createSession(language, shouldTranscribe)
        this.sessions.set(language, session)
        for (const chunk of this.preroll) session.translator.append(chunk)
        continue
      }
      if (existing.transcribe !== shouldTranscribe) {
        existing.transcribe = shouldTranscribe
        existing.translator.setTranscribe(shouldTranscribe)
      }
    }
  }

  private createSession(language: string, transcribe: boolean): LiveSession {
    const live: LiveSession = {
      language,
      transcribe,
      closing: false,
      translator: undefined as unknown as Translator,
    }
    const handlers: TranslationHandlers = {
      onAudio: (pcm) => this.fanoutAudio(language, pcm),
      onOutputTranscript: (delta, done, transcript) => {
        this.fanout(this.listenersIn(language), {
          type: "transcript",
          side: "translation",
          delta,
          done,
          transcript,
        })
      },
      onInputTranscript: (delta, done, transcript) => {
        if (this.transcriber !== language) return
        this.fanout(
          [...this.seats.values()].filter((seat) => seat.role === "speaker" || seat.listening),
          { type: "transcript", side: "source", delta, done, transcript },
        )
      },
      onError: (failure) => {
        this.fanout([this.speaker(), ...this.listenersIn(language)].filter((seat) => seat !== undefined), {
          type: "error",
          code: failure.code,
          message: failure.message,
        })
      },
      onClosed: () => {
        if (this.sessions.get(language) !== live) return
        this.sessions.delete(language)
        if (this.transcriber === language) this.transcriber = null
        if (live.closing) return
        const drops = (this.failures.get(language) ?? 0) + 1
        this.failures.set(language, drops)
        if (drops >= MAX_DROPS) {
          this.fanout([this.speaker(), ...this.listenersIn(language)].filter((seat) => seat !== undefined), {
            type: "error",
            code: "translation_stopped",
            message: "La traducción se detuvo. Silencia el micrófono y vuelve a abrirlo.",
          })
          return
        }
        this.syncSessions("drop")
      },
    }
    live.translator = this.openTranslator(language, transcribe, `puente-${this.code}`, handlers)
    return live
  }

  private closeLanguage(language: string) {
    const session = this.sessions.get(language)
    if (!session) return
    session.closing = true
    this.sessions.delete(language)
    if (this.transcriber === language) this.transcriber = null
    session.translator.close()
  }

  private remember(pcm: Buffer) {
    this.preroll.push(pcm)
    this.prerollBytes += pcm.length
    while (this.prerollBytes > MAX_PREROLL_BYTES && this.preroll.length > 1) {
      this.prerollBytes -= this.preroll[0]!.length
      this.preroll.shift()
    }
  }

  private speaker(): Seat | undefined {
    return [...this.seats.values()].find((seat) => seat.role === "speaker")
  }

  private listenersIn(language: string): Seat[] {
    return [...this.seats.values()].filter(
      (seat) => seat.role === "listener" && seat.listening && seat.language === language,
    )
  }

  private waitingCount(): number {
    return [...this.seats.values()].filter((seat) => seat.role === "listener" && !seat.listening).length
  }

  private listenerCounts(): ListenerCount[] {
    const counts = new Map<string, number>()
    for (const seat of this.seats.values()) {
      if (seat.role !== "listener" || !seat.listening || !seat.language) continue
      counts.set(seat.language, (counts.get(seat.language) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([language, count]) => ({ language, count }))
  }

  private fanoutAudio(language: string, pcm: Buffer) {
    for (const seat of this.listenersIn(language)) {
      if (seat.socket.readyState === OPEN) seat.socket.send(pcm)
    }
  }

  private fanout(seats: Seat[], message: ServerMessage) {
    for (const seat of seats) this.send(seat, message)
  }

  private broadcastRoom() {
    for (const seat of this.seats.values()) this.send(seat, { type: "room", room: this.roomFor(seat) })
  }

  private roomFor(seat: Seat): RoomSnapshot {
    return {
      ...this.publicSnapshot(),
      you: {
        role: seat.role,
        language: seat.language,
        listening: seat.listening,
      },
    }
  }

  private send(seat: Seat, message: ServerMessage) {
    if (seat.socket.readyState !== OPEN) return
    seat.socket.send(JSON.stringify(message))
  }
}

export class EventHub {
  private readonly events = new Map<string, EventRoom>()

  constructor(
    private readonly options: {
      apiKeyConfigured: boolean
      openTranslator: OpenTranslator
    },
  ) {}

  create(name: string): EventRoom {
    let code = generateCode()
    while (this.events.has(code)) code = generateCode()
    const room = new EventRoom({
      code,
      name,
      apiKeyConfigured: this.options.apiKeyConfigured,
      openTranslator: this.options.openTranslator,
    })
    this.events.set(code, room)
    return room
  }

  get(code: string): EventRoom | undefined {
    return this.events.get(normalizeCode(code))
  }
}
