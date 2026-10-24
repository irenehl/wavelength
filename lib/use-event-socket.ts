"use client"

import { useEffect, useRef, useState } from "react"
import { PcmPlayer } from "@/lib/audio/playback"
import { emptyCaptions, reduceCaption, type CaptionState } from "@/lib/captions"
import type { RoomNotice } from "@/lib/copy"
import type { RoomSnapshot, ServerMessage } from "@/lib/protocol"

function decodeAudio(data: string) {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

export function useEventSocket(code: string, role: "speaker" | "listener", enabled: boolean, name = "") {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<RoomNotice | null>(null)
  const [fatal, setFatal] = useState<RoomNotice | null>(null)
  const [source, setSource] = useState<CaptionState>(emptyCaptions)
  const [translation, setTranslation] = useState<CaptionState>(emptyCaptions)
  const seatRef = useRef<string | null>(null)
  const micRef = useRef(false)
  const languageRef = useRef<string | null>(null)
  const audioRef = useRef<Uint8Array[]>([])
  const sendingRef = useRef(false)
  const [player] = useState(() => new PcmPlayer())

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let sourceEvent: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const apply = (message: ServerMessage) => {
      if (message.type === "room") {
        setRoom(message.room)
        return
      }
      if (message.type === "error") {
        const notice = { code: message.code, message: message.message }
        if (message.fatal) {
          stopped = true
          setFatal(notice)
          sourceEvent?.close()
          return
        }
        setError(notice)
        return
      }
      if (message.type === "transcript") {
        const update = {
          delta: message.delta,
          done: message.done,
          reset: message.reset,
          transcript: message.transcript,
        }
        if (message.side === "source") setSource((prev) => reduceCaption(prev, update))
        if (message.side === "translation") setTranslation((prev) => reduceCaption(prev, update))
      }
    }

    const openStream = (seatId: string) => {
      if (stopped) return
      const events = new EventSource(`/api/events/${encodeURIComponent(code)}/live?seatId=${encodeURIComponent(seatId)}`)
      sourceEvent = events
      events.onopen = () => setConnected(true)
      events.onmessage = (event) => {
        apply(JSON.parse(event.data) as ServerMessage)
      }
      events.addEventListener("audio", (event) => {
        player.push(decodeAudio((event as MessageEvent<string>).data))
      })
      events.onerror = () => {
        setConnected(false)
        events.close()
        if (stopped) return
        timer = setTimeout(() => {
          void connect()
        }, 800)
      }
    }

    const connect = async () => {
      if (stopped) return
      try {
        let seatId = seatRef.current
        if (!seatId) {
          const response = await fetch(`/api/events/${encodeURIComponent(code)}/join`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role, name }),
          })
          const body = (await response.json()) as { seatId?: string; code?: string; message?: string }
          if (!response.ok || !body.seatId) {
            const notice = { code: body.code, message: body.message }
            if (response.status === 409 || body.code === "speaker_taken" || body.code === "event_missing") {
              stopped = true
              setFatal(notice)
              return
            }
            throw new Error(body.message || "join")
          }
          seatId = body.seatId
          seatRef.current = seatId
        }
        if (role === "speaker" && micRef.current) {
          void signal({ type: "mic", live: true }, seatId)
        }
        if (role === "listener" && languageRef.current) {
          void signal({ type: "listen", language: languageRef.current }, seatId)
        }
        openStream(seatId)
      } catch {
        if (stopped) return
        setConnected(false)
        timer = setTimeout(() => {
          void connect()
        }, 800)
      }
    }

    void connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      sourceEvent?.close()
      seatRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signal uses refs
  }, [code, enabled, name, player, role])

  useEffect(() => {
    return () => player.close()
  }, [player])

  async function signal(message: object, seatId = seatRef.current) {
    if (!seatId) return
    await fetch(`/api/events/${encodeURIComponent(code)}/signal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, ...message }),
    })
  }

  async function flushAudio() {
    if (sendingRef.current) return
    sendingRef.current = true
    while (audioRef.current.length && seatRef.current) {
      const chunks = audioRef.current.splice(0, 4)
      const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0))
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      try {
        await fetch(`/api/events/${encodeURIComponent(code)}/audio`, {
          method: "POST",
          headers: { "x-seat-id": seatRef.current },
          body: bytes,
        })
      } catch {
        break
      }
    }
    sendingRef.current = false
  }

  return {
    room,
    connected,
    error,
    fatal,
    source,
    translation,
    player,
    clearError() {
      setError(null)
    },
    announceMic(live: boolean) {
      micRef.current = live
      void signal({ type: "mic", live })
    },
    announceListen(language: string) {
      languageRef.current = language
      setTranslation(emptyCaptions)
      player.reset()
      void signal({ type: "listen", language })
    },
    sendAudio(pcm: ArrayBuffer) {
      audioRef.current.push(new Uint8Array(pcm))
      void flushAudio()
    },
  }
}
