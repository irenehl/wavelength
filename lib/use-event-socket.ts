"use client"

import { useEffect, useRef, useState } from "react"
import { decodeBase64Pcm } from "@/lib/audio/pcm"
import { PcmPlayer } from "@/lib/audio/playback"
import { commitIdle, emptyCaptions, reduceCaption, type CaptionState } from "@/lib/captions"
import type { RoomNotice } from "@/lib/copy"
import type { RoomSnapshot, ServerMessage } from "@/lib/protocol"
import { rememberSeat, storedSeat } from "@/lib/seat-storage"

const MAX_IN_FLIGHT = 1

export function useEventSocket(code: string, role: "speaker" | "listener", enabled: boolean, name = "") {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<RoomNotice | null>(null)
  const [fatal, setFatal] = useState<RoomNotice | null>(null)
  const [source, setSource] = useState<CaptionState>(emptyCaptions)
  const [translation, setTranslation] = useState<CaptionState>(emptyCaptions)
  const [audioReady, setAudioReady] = useState(false)
  const seatRef = useRef<string | null>(null)
  const micRef = useRef(false)
  const languageRef = useRef<string | null>(null)
  const audioRef = useRef<Uint8Array[]>([])
  const sendingRef = useRef(0)
  const [player] = useState(() => new PcmPlayer())

  useEffect(() => player.subscribe(setAudioReady), [player])

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let sourceEvent: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const playAudio = (encoded: string) => {
      const pcm = decodeBase64Pcm(encoded)
      if (pcm) player.push(pcm)
    }

    const apply = (message: ServerMessage) => {
      if (message.type === "audio") {
        playAudio(message.audio)
        return
      }
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
      events.onopen = () => {
        setConnected(true)
        if (role === "listener" && player.didUnlock) void player.resume()
      }
      events.onmessage = (event) => {
        if (!event.data) return
        try {
          apply(JSON.parse(event.data) as ServerMessage)
        } catch {
          // keep the stream; one bad frame should not drop captions
        }
      }
      events.addEventListener("audio", (event) => {
        playAudio((event as MessageEvent<string>).data)
      })
      events.onerror = () => {
        setConnected(false)
        if (stopped) return
        if (events.readyState === EventSource.CONNECTING) return
        events.close()
        timer = setTimeout(() => {
          void connect()
        }, 800)
      }
    }

    const connect = async () => {
      if (stopped) return
      try {
        const known = seatRef.current || storedSeat(code, role)
        const response = await fetch(`/api/events/${encodeURIComponent(code)}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role, name, seatId: known || undefined }),
        })
        const body = (await response.json()) as { seatId?: string; code?: string; message?: string }
        if (!response.ok || !body.seatId) {
          const notice = { code: body.code, message: body.message }
          if (response.status === 409 && known) {
            seatRef.current = known
            openStream(known)
            return
          }
          if (response.status === 409 || body.code === "speaker_taken" || body.code === "event_missing") {
            stopped = true
            setFatal(notice)
            return
          }
          throw new Error(body.message || "join")
        }
        seatRef.current = body.seatId
        rememberSeat(code, role, body.seatId)
        if (role === "speaker" && micRef.current) {
          void signal({ type: "mic", live: true }, body.seatId)
        }
        if (role === "listener" && languageRef.current) {
          void signal({ type: "listen", language: languageRef.current }, body.seatId)
        }
        openStream(body.seatId)
      } catch {
        if (stopped) return
        setConnected(false)
        timer = setTimeout(() => {
          void connect()
        }, 400)
      }
    }

    void connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      sourceEvent?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signal uses refs
  }, [code, enabled, name, player, role])

  useEffect(() => {
    if (!enabled) return
    const beat = () => {
      const seatId = seatRef.current
      if (!seatId) return
      void signal({ type: "ping" }, seatId)
    }
    const timer = setInterval(beat, 12_000)
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      beat()
      if (role === "listener" && player.didUnlock) void player.resume()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signal uses refs
  }, [code, enabled, player, role])

  useEffect(() => {
    const timer = setInterval(() => {
      setSource((prev) => commitIdle(prev))
      setTranslation((prev) => commitIdle(prev))
    }, 400)
    return () => clearInterval(timer)
  }, [])

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
    if (sendingRef.current >= MAX_IN_FLIGHT) return
    sendingRef.current += 1
    try {
      while (audioRef.current.length && seatRef.current) {
        const chunk = audioRef.current.shift()
        if (!chunk) break
        try {
          const body = new Uint8Array(chunk.byteLength)
          body.set(chunk)
          await fetch(`/api/events/${encodeURIComponent(code)}/audio`, {
            method: "POST",
            headers: { "x-seat-id": seatRef.current },
            body: body.buffer,
            cache: "no-store",
            keepalive: true,
          })
        } catch {
          break
        }
      }
    } finally {
      sendingRef.current -= 1
      if (audioRef.current.length && seatRef.current) void flushAudio()
    }
  }

  return {
    room,
    connected,
    error,
    fatal,
    source,
    translation,
    player,
    audioReady,
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
