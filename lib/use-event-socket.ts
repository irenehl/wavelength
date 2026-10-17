"use client"

import { useEffect, useRef, useState } from "react"
import { PcmPlayer } from "@/lib/audio/playback"
import { emptyCaptions, reduceCaption, type CaptionState } from "@/lib/captions"
import type { RoomSnapshot, ServerMessage } from "@/lib/protocol"

export function useEventSocket(code: string, role: "speaker" | "listener", enabled: boolean) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const [source, setSource] = useState<CaptionState>(emptyCaptions)
  const [translation, setTranslation] = useState<CaptionState>(emptyCaptions)
  const socketRef = useRef<WebSocket | null>(null)
  const micRef = useRef(false)
  const languageRef = useRef<string | null>(null)
  const [player] = useState(() => new PcmPlayer())

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let socket: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      if (stopped) return
      const protocol = window.location.protocol === "https:" ? "wss" : "ws"
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws?code=${encodeURIComponent(code)}`)
      socket = ws
      socketRef.current = ws
      ws.binaryType = "arraybuffer"
      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify({ type: "join", role }))
        if (role === "speaker" && micRef.current) ws.send(JSON.stringify({ type: "mic", live: true }))
        if (role === "listener" && languageRef.current) {
          ws.send(JSON.stringify({ type: "listen", language: languageRef.current }))
        }
      }
      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          player.push(event.data)
          return
        }
        const message = JSON.parse(String(event.data)) as ServerMessage
        if (message.type === "room") {
          setRoom(message.room)
          return
        }
        if (message.type === "error") {
          if (message.fatal) {
            stopped = true
            setFatal(message.message)
            ws.close()
            return
          }
          setError(message.message)
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
      ws.onclose = () => {
        setConnected(false)
        if (stopped) return
        timer = setTimeout(connect, 800)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      socket?.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [code, enabled, player, role])

  useEffect(() => {
    return () => player.close()
  }, [player])

  function send(message: object) {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
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
      send({ type: "mic", live })
    },
    announceListen(language: string) {
      languageRef.current = language
      setTranslation(emptyCaptions)
      player.reset()
      send({ type: "listen", language })
    },
    sendAudio(pcm: ArrayBuffer) {
      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) socket.send(pcm)
    },
  }
}
