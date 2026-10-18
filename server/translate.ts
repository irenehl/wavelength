import WebSocket from "ws"
import type { Translator } from "./translator"

const MAX_QUEUE_BYTES = 24000 * 2 * 2

type TranslationEvent = {
  type?: string
  delta?: unknown
  transcript?: unknown
  error?: { code?: string; type?: string; message?: string }
}

export function openTranslation(options: {
  apiKey: string
  language: string
  transcribe: boolean
  safetyId: string
  onAudio: (pcm: Buffer) => void
  onOutputTranscript: (delta: string, done: boolean, transcript?: string) => void
  onInputTranscript: (delta: string, done: boolean, transcript?: string) => void
  onError: (failure: { message: string; code: string }) => void
  onClosed: () => void
}): Translator {
  let transcribe = options.transcribe
  let ready = false
  let finished = false
  let acceptAudio = true
  const queue: Buffer[] = []
  let queuedBytes = 0

  const socket = new WebSocket(
    "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate",
    {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "OpenAI-Safety-Identifier": options.safetyId,
      },
    },
  )

  const sendUpdate = () => {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          audio: {
            input: {
              transcription: transcribe ? { model: "gpt-realtime-whisper" } : null,
              noise_reduction: { type: "near_field" },
            },
            output: { language: options.language },
          },
        },
      }),
    )
  }

  const finish = () => {
    if (finished) return
    finished = true
    acceptAudio = false
    options.onClosed()
  }

  const appendNow = (pcm: Buffer) => {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(
      JSON.stringify({
        type: "session.input_audio_buffer.append",
        audio: pcm.toString("base64"),
      }),
    )
  }

  socket.on("open", sendUpdate)

  socket.on("message", (data) => {
    let event: TranslationEvent
    try {
      event = JSON.parse(data.toString()) as TranslationEvent
    } catch {
      return
    }

    if (event.type === "session.updated" && !ready) {
      ready = true
      const pending = queue.splice(0, queue.length)
      queuedBytes = 0
      for (const chunk of pending) appendNow(chunk)
      return
    }

    if (event.type === "session.output_audio.delta" && typeof event.delta === "string") {
      options.onAudio(Buffer.from(event.delta, "base64"))
      return
    }

    if (event.type === "session.output_transcript.delta" && typeof event.delta === "string") {
      options.onOutputTranscript(event.delta, false)
      return
    }

    if (event.type === "session.output_transcript.done") {
      const transcript = typeof event.transcript === "string" ? event.transcript : undefined
      options.onOutputTranscript("", true, transcript)
      return
    }

    if (event.type === "session.input_transcript.delta" && transcribe && typeof event.delta === "string") {
      options.onInputTranscript(event.delta, false)
      return
    }

    if (event.type === "session.input_transcript.done" && transcribe) {
      const transcript = typeof event.transcript === "string" ? event.transcript : undefined
      options.onInputTranscript("", true, transcript)
      return
    }

    if (event.type === "session.closed") {
      finish()
      return
    }

    if (event.type === "error") {
      options.onError(translationFailure(event))
    }
  })

  socket.on("error", () => {
    options.onError({
      code: "translation_connect",
      message: "No pudimos conectar con la traducción.",
    })
  })

  socket.on("close", finish)

  return {
    append(pcm) {
      if (!acceptAudio || pcm.length === 0) return
      if (!ready) {
        queue.push(pcm)
        queuedBytes += pcm.length
        while (queuedBytes > MAX_QUEUE_BYTES && queue.length > 1) {
          queuedBytes -= queue[0]!.length
          queue.shift()
        }
        return
      }
      appendNow(pcm)
    },
    setTranscribe(on) {
      if (transcribe === on) return
      transcribe = on
      sendUpdate()
    },
    close() {
      acceptAudio = false
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "session.close" }))
        const timer = setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) socket.close()
        }, 4000)
        timer.unref()
        return
      }
      socket.close()
      finish()
    },
  }
}

function translationFailure(event: TranslationEvent): { message: string; code: string } {
  const code = event.error?.code || event.error?.type || ""
  const message = event.error?.message || ""
  if (code === "invalid_api_key" || /incorrect api key|invalid api key/i.test(message)) {
    return { code: "invalid_key", message: "La llave de OpenAI no es válida." }
  }
  if (/language/i.test(message)) {
    return { code: "language_unsupported", message: "Ese idioma no se puede traducir ahora." }
  }
  return {
    code: "translation_failed",
    message: "La traducción falló. Si sigue pasando, revisa la llave y la conexión.",
  }
}
