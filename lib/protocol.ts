export type ListenerCount = {
  language: string
  count: number
}

export type EventPublic = {
  code: string
  name: string
  speakerPresent: boolean
  micLive: boolean
  apiKeyConfigured: boolean
  waiting: number
  listenerCounts: ListenerCount[]
}

export type RoomSnapshot = EventPublic & {
  you: {
    role: "speaker" | "listener"
    language: string | null
    listening: boolean
  } | null
}

export type ServerMessage =
  | { type: "room"; room: RoomSnapshot }
  | {
      type: "transcript"
      side: "source" | "translation"
      delta: string
      done: boolean
      reset?: boolean
      snapshot?: boolean
      transcript?: string
    }
  | { type: "error"; message: string; code?: string; fatal?: boolean }
  | { type: "audio"; audio: string }
  | { type: "ping" }
